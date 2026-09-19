<script setup lang="ts">
import TheToast from '~/components/ui/TheToast.vue'
import { firstInvalid, validateBooking } from '~/utils/booking'
import type { BookingErrors } from '~/utils/booking'
import type { Appointment, AppointmentSlot } from '#shared/types/domain'

/**
 * The close of the feed: the one thing the whole briefing is asking for.
 *
 * Everything above it is the project explaining itself; this is the only place
 * that wants something back, so it is the only card with a border and a filled
 * button — and the only one that opens.
 *
 * It opens in place rather than navigating. The briefing is the argument for
 * booking, and taking someone away from it to fill in three fields asks them to
 * carry that argument in their head. The button stays where it is and becomes
 * the one that confirms.
 */

const props = defineProps<{
  projectName: string
  projectSlug: string
  developer: string
}>()

const open = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const booking = ref<Appointment | null>(null)
const failure = ref<string | null>(null)

const name = ref('')
const email = ref('')
const slot = ref('')

const nameField = ref<HTMLInputElement | null>(null)
const emailField = ref<HTMLInputElement | null>(null)
const slotGroup = ref<HTMLElement | null>(null)

/*
 * The slots are not fetched until the form opens. They are the bottom of a
 * 4,000px page and most visitors will never reach them; requesting them on load
 * spends someone's connection on a screen they have not asked for yet.
 */
const {
  data: slots,
  status: slotStatus,
  error: slotError,
  execute: loadSlots,
  refresh: retrySlots,
} = useApiFetch<readonly AppointmentSlot[]>('/api/appointments/slots', {
  key: 'appointment-slots',
  immediate: false,
})

const scenario = useScenarioQuery()

const slotsLoading = computed(() => open.value && ['pending', 'idle'].includes(slotStatus.value))
const available = computed(() => (slots.value ?? []).filter(candidate => candidate.available))

const draft = computed(() => ({ name: name.value, email: email.value, slot: slot.value }))

/*
 * Errors are withheld until the form has been sent once. Marking a field wrong
 * before anyone has attempted it scolds them for not having typed yet; after
 * that first attempt they update live, so a fix is acknowledged immediately.
 */
const errors = computed<BookingErrors>(() => (submitted.value ? validateBooking(draft.value) : {}))

const cta = ref<HTMLButtonElement | null>(null)
const card = ref<HTMLElement | null>(null)
const formEl = ref<HTMLFormElement | null>(null)
const disclosure = ref<HTMLFieldSetElement | null>(null)
const fields = ref<HTMLElement | null>(null)

/**
 * Brings the opened form into view.
 *
 * The card is the last thing on a four-thousand-pixel page, so pressing the
 * button otherwise reveals a form mostly below the fold and leaves someone to
 * scroll for it themselves.
 *
 * It is the form that is aimed at, not the card. On a short window the card —
 * icon, heading, blurb and all — is taller than the viewport and cannot be
 * shown whole; the part worth showing is the one being asked to fill in.
 *
 * `window.scrollTo` rather than `scrollIntoView`, because the page sets
 * `scroll-padding-block-start` for anchored links and that would push the form
 * down by seven rem for no reason here. `behavior` is left off either way: its
 * default defers to the page's own `scroll-behavior`, which is smooth, and
 * which the reduced-motion block already turns off.
 */
const GUTTER = 16

const reveal = async () => {
  await nextTick()
  const el = formEl.value
  if (!el) return

  /*
   * How much taller the form is about to get. While the row is closed its
   * fields are clipped rather than resized, so scrollHeight already knows their
   * full height while the rendered box is still nothing. Once open the two
   * agree and this is zero, which is what lets the same call be used before and
   * after the panel has finished opening.
   */
  const rendered = fields.value?.getBoundingClientRect().height ?? 0
  const grow = Math.max(0, (fields.value?.scrollHeight ?? 0) - rendered)

  const box = el.getBoundingClientRect()
  const height = box.height + grow
  const top = window.scrollY + box.top

  window.scrollTo({
    top: Math.max(0, height + GUTTER * 2 <= window.innerHeight
      ? top - (window.innerHeight - height) / 2
      : top - GUTTER),
  })
}

/** Resolves when the disclosure has stopped growing, or soon enough anyway. */
const settled = () => new Promise<void>((resolve) => {
  const el = disclosure.value
  if (!el) return resolve()

  let done = false
  const finish = () => {
    if (done) return
    done = true
    el.removeEventListener('transitionend', finish)
    resolve()
  }

  el.addEventListener('transitionend', finish)
  // A transition that never fires — reduced motion collapses it to nothing —
  // must not leave this hanging.
  setTimeout(finish, 800)
})

const expand = async () => {
  open.value = true

  /*
   * Twice, and both are needed. The first moves the page while the panel is
   * still opening, so something happens immediately. But at that moment the
   * document has not grown yet, and if the card was already at the bottom of
   * the page there is nowhere to scroll to — the browser clamps it and nothing
   * moves at all. The second runs once the panel has stopped growing and the
   * times have arrived, when the room it needs finally exists.
   */
  reveal()
  await loadSlots()
  await settled()
  await reveal()
}

/**
 * Closing without booking.
 *
 * What was typed stays. Someone who opens the form, thinks better of it and
 * opens it again an hour later has not changed their mind about their own name,
 * and throwing it away is a punishment for hesitating. The complaints do go —
 * reopening to be told off for a form you never sent is worse than not being
 * told at all.
 *
 * Focus comes back to the control that opened it, because that control is now
 * the only thing left to press and a keyboard is otherwise stranded on a
 * fieldset that has just been made inert.
 */
const collapse = async () => {
  open.value = false
  submitted.value = false
  failure.value = null
  await nextTick()
  cta.value?.focus()
}

const focusField = (field: ReturnType<typeof firstInvalid>) => {
  if (field === 'name') nameField.value?.focus()
  else if (field === 'email') emailField.value?.focus()
  else slotGroup.value?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus()
}

const submit = async () => {
  submitted.value = true
  failure.value = null

  const found = validateBooking(draft.value)
  if (Object.keys(found).length > 0) {
    // Sending someone back to the top of a form to hunt for the problem is the
    // same as not telling them where it is.
    await nextTick()
    return focusField(firstInvalid(found))
  }

  submitting.value = true

  try {
    booking.value = await $fetch<Appointment>('/api/appointments', {
      method: 'POST',
      query: scenario.value,
      body: {
        name: name.value.trim(),
        email: email.value.trim(),
        slot: slot.value,
        projectSlug: props.projectSlug,
      },
    })
  }
  catch (error) {
    // A taken slot is the one failure the person can actually act on, so it is
    // the one whose message is worth repeating. Everything else gets a sentence
    // that says what to do rather than what went wrong.
    const status = (error as { statusCode?: number }).statusCode
    failure.value = status === 409
      ? 'That time was taken while you were filling this in. Choose another and we will confirm it.'
      : 'That booking did not go through. Nothing has been reserved — try again.'

    if (status === 409) await retrySlots()
  }
  finally {
    submitting.value = false
  }
}

/**
 * One control, one event.
 *
 * The button was `type="button"` when closed and `type="submit"` when open,
 * which looked right and fired twice: Vue flushes DOM updates in a microtask,
 * and microtasks run before the browser carries out a click's default action —
 * so the very click that opened the form found a submit button by the time the
 * browser acted on it, and submitted the empty form it had just revealed.
 *
 * It stays a submit button throughout and the form decides what submitting
 * means, which also keeps Enter working from inside a field.
 */
const onSubmit = () => (open.value ? submit() : expand())

const label = computed(() => {
  if (submitting.value) return 'Confirming…'
  return open.value ? 'Confirm booking' : 'Book appointment'
})

const toast = computed(() =>
  booking.value
    ? `Viewing confirmed for ${booking.value.slotLabel}. Your reference is ${booking.value.reference}.`
    : null,
)
</script>

<template>
  <section
    ref="card"
    class="request"
    aria-labelledby="viewing-heading"
  >
    <TheToast :message="toast" />

    <p class="badge">
      <img
        class="h-6 w-[1.3125rem]"
        src="/icons/calendar-check.svg"
        alt=""
        width="21"
        height="24"
      >
    </p>

    <h2
      id="viewing-heading"
      class="pt-1 text-balance text-[clamp(1.15rem,1rem+0.6cqi,1.6rem)] font-normal leading-[1.6] text-white"
    >
      {{ booking ? 'Your viewing is booked' : 'Schedule Private Viewing' }}
    </h2>

    <!-- Booked. The form has done its job and goes; what is left is the thing
         they will need to quote on the day. -->
    <template v-if="booking">
      <p class="max-w-[22rem] text-pretty text-[clamp(0.8rem,0.75rem+0.3cqi,1rem)] leading-[1.5] text-note-text">
        We have emailed <strong class="font-medium text-text">{{ booking.email }}</strong>.
        A member of the team will meet you at {{ projectName }}.
      </p>

      <dl class="receipt">
        <dt>When</dt>
        <dd>
          <time :datetime="booking.slot">{{ booking.slotLabel }}</time>
        </dd>
        <dt>Reference</dt>
        <dd><data :value="booking.reference">{{ booking.reference }}</data></dd>
      </dl>
    </template>

    <template v-else>
      <p class="max-w-[20rem] text-pretty text-[clamp(0.8rem,0.75rem+0.3cqi,1rem)] leading-[1.45] text-note-text">
        Experience {{ projectName }} with our exclusive tour
      </p>

      <form
        ref="formEl"
        class="booking"
        novalidate
        @submit.prevent="onSubmit"
        @keydown.esc="open && !submitting && collapse()"
      >
        <!-- The disclosure. Closed it is a zero-height row; open it is the
             height of its own content, so the button below is pushed down by
             exactly as much room as the fields need. -->
        <fieldset
          ref="disclosure"
          class="disclosure"
          :class="{ 'is-open': open }"
          :aria-hidden="!open"
          :inert="!open || undefined"
        >
          <legend class="visually-hidden">Your viewing details</legend>

          <ul
            ref="fields"
            class="fields"
          >
            <li>
              <fieldset
                ref="slotGroup"
                class="slots"
              >
                <legend>Choose a time</legend>
                <small class="help">Viewings last about forty minutes.</small>

                <!-- Loading: the chips' own shape, so nothing jumps when the
                     times arrive. -->
                <ul
                  v-if="slotsLoading"
                  class="chips"
                  aria-busy="true"
                >
                  <li
                    v-for="width in ['8.5rem', '9.5rem', '8rem', '9rem']"
                    :key="width"
                  >
                    <i
                      class="skeleton block h-11 rounded-card"
                      :style="{ inlineSize: width }"
                    />
                  </li>
                  <li class="visually-hidden">Fetching the available times.</li>
                </ul>

                <p
                  v-else-if="slotError"
                  class="note"
                >
                  The times did not load.
                  <button
                    class="underline decoration-from-font underline-offset-2 hover:decoration-2"
                    type="button"
                    @click="retrySlots()"
                  >Try again</button>
                </p>

                <p
                  v-else-if="available.length === 0"
                  class="note"
                >
                  Every viewing this week is taken. Email
                  <a
                    class="text-text-bright underline decoration-from-font underline-offset-2"
                    href="mailto:viewings@rechitta.com"
                  >viewings@rechitta.com</a>
                  and we will find you one.
                </p>

                <ul
                  v-else
                  class="chips"
                >
                  <li
                    v-for="option in slots"
                    :key="option.id"
                  >
                    <label
                      class="chip"
                      :class="{ 'is-taken': !option.available }"
                    >
                      <input
                        v-model="slot"
                        class="visually-hidden"
                        type="radio"
                        name="slot"
                        :value="option.iso"
                        :disabled="!option.available"
                        :aria-invalid="Boolean(errors.slot)"
                      >
                      <time :datetime="option.iso">{{ option.label }}</time>
                      <!-- The reason a control is unavailable is on the control,
                           never hidden in a tooltip nobody on a tablet can see. -->
                      <small
                        v-if="!option.available"
                        class="taken"
                      >Taken</small>
                    </label>
                  </li>
                </ul>
              </fieldset>
            </li>

            <li>
              <p class="field">
                <label for="booking-name">Your name</label>
                <small id="booking-name-help">Whoever will be meeting us at the door.</small>
                <input
                  id="booking-name"
                  ref="nameField"
                  v-model="name"
                  type="text"
                  name="name"
                  autocomplete="name"
                  aria-describedby="booking-name-help"
                  :aria-invalid="Boolean(errors.name)"
                  :class="{ 'is-wrong': errors.name }"
                >
              </p>
            </li>

            <li>
              <p class="field">
                <label for="booking-email">Email</label>
                <small id="booking-email-help">We send the confirmation and the directions here.</small>
                <input
                  id="booking-email"
                  ref="emailField"
                  v-model="email"
                  type="email"
                  name="email"
                  autocomplete="email"
                  inputmode="email"
                  aria-describedby="booking-email-help"
                  :aria-invalid="Boolean(errors.email)"
                  :class="{ 'is-wrong': errors.email }"
                >
              </p>
            </li>
            <!-- Every problem in one place, announced as it changes, and
                 inside the list so the panel has a single row to collapse. A
                 second grid child keeps its own auto row and the disclosure
                 never quite closes. -->
            <li>
              <output class="problems">
                <template v-if="errors.slot || errors.name || errors.email || failure">
                  <strong class="font-medium text-alert">Needs a moment.</strong>
                  {{ errors.slot ?? errors.name ?? errors.email ?? failure }}
                </template>
              </output>
            </li>
          </ul>
        </fieldset>

        <p class="action">
          <!-- Only while there is something to close. A dismiss control on a
               form that is not open is a control that does nothing. -->
          <button
            v-if="open"
            class="dismiss"
            type="button"
            :disabled="submitting"
            @click="collapse"
          >
            Not now
            <em class="visually-hidden">— close the booking form</em>
          </button>

          <button
            ref="cta"
            class="cta"
            type="submit"
            :aria-expanded="open"
            :aria-busy="submitting"
            :disabled="submitting"
          >
            {{ label }}
            <img
              class="size-5"
              src="/icons/arrow-right.svg"
              alt=""
              width="20"
              height="20"
            >
          </button>
        </p>
      </form>
    </template>

    <p class="text-small leading-[1.35] text-text-faint">
      <cite class="not-italic">{{ developer }}</cite>
    </p>
  </section>
</template>

<style scoped>
.request {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  inline-size: 100%;
  max-inline-size: var(--spacing-column);
  margin-inline: auto;
  padding: clamp(1.5rem, 5cqi, 2.5rem);
  text-align: center;
  border: 1px solid rgb(198 160 89 / 0.1);
  border-radius: var(--radius-panel);
  background-color: rgb(255 255 255 / 0.03);
  backdrop-filter: blur(10px);
}

.badge {
  display: grid;
  place-items: center;
  inline-size: 4rem;
  block-size: 4rem;
  border-radius: var(--radius-pill);
  background-color: rgb(198 160 89 / 0.1);
}

.booking {
  inline-size: 100%;
}

/*
 * The disclosure, as a grid row that grows from nothing to the height of its
 * own content.
 *
 * This is the one place the transform-and-opacity rule cannot hold: opening
 * *is* a change of height, and the alternative — scaling — would stretch the
 * type inside. The row is the only thing that animates; everything in it moves
 * on opacity and translate.
 */
.disclosure {
  display: grid;
  grid-template-rows: 0fr;
  inline-size: 100%;
  min-inline-size: 0;
  border: 0;
  padding: 0;
  margin: 0;
  transition: grid-template-rows var(--duration-slow) var(--ease-out-soft);
}

.disclosure.is-open {
  grid-template-rows: 1fr;
}

.fields {
  min-block-size: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: start;
}

/* The gap before the button lives on the last item, not on the list. On the
   list it survives the collapse — a fieldset keeps its padding even when its
   grid row is zero — and the disclosure never quite shuts. */
.fields > li:last-child {
  padding-block-end: 1.25rem;
}

/* Each field arrives after the row has started opening, a beat apart, so the
   form assembles rather than appearing. */
.fields > li {
  opacity: 0;
  translate: 0 -0.5rem;
  transition:
    opacity var(--duration-base) var(--ease-out-soft),
    translate var(--duration-base) var(--ease-out-soft);
}

.disclosure.is-open .fields > li {
  opacity: 1;
  translate: 0 0;
}

.disclosure.is-open .fields > li:nth-child(2) {
  transition-delay: 80ms;
}

.disclosure.is-open .fields > li:nth-child(3) {
  transition-delay: 160ms;
}

.disclosure.is-open .fields > li:nth-child(4) {
  transition-delay: 200ms;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/*
 * A real radio behind each chip: native arrow-key navigation, native checked
 * state, a real accessible name. The label wears the focus ring, because a ring
 * drawn on a visually hidden 1px input is a ring nobody can see.
 */
.chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-block-size: 2.75rem;
  padding-inline: 0.75rem;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-card);
  font-size: var(--text-small);
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color var(--duration-quick) var(--ease-out-soft),
    border-color var(--duration-quick) var(--ease-out-soft);
}

.chip:hover:not(.is-taken) {
  border-color: var(--color-gold);
}

.chip:has(:checked) {
  border-color: rgb(198 160 89 / 0.6);
  background-color: var(--color-gold-soft);
  color: var(--color-text);
}

.chip:has(:focus-visible) {
  outline: 2px solid var(--color-gold);
  outline-offset: 3px;
}

.chip.is-taken {
  cursor: not-allowed;
  color: var(--color-text-faint);
  border-style: dashed;
}

.taken {
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-faint);
}

/* Helper text sits between the label and the control. A placeholder is never
   the label. */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/*
 * One rule for all three, because a group of times is a field like any other.
 * The legend used to be set as an eyebrow — uppercase, letter-spaced, faint —
 * which made it read as a section heading sitting above the form rather than
 * as the label of the control under it.
 */
.field label,
.slots legend {
  font-family: var(--font-ui);
  font-size: var(--text-small);
  font-weight: 500;
  color: var(--color-text);
}

.field small,
.slots .help {
  display: block;
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-note-text);
}

.slots {
  min-inline-size: 0;
}

/* A fieldset's legend sits outside its flex flow, so the rhythm the other
   fields get from `gap` is set here by hand — to the same 0.35rem. */
.slots legend,
.slots .help {
  margin-block-end: 0.35rem;
}

.field input {
  min-block-size: 2.75rem;
  padding-inline: 0.75rem;
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-card);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-ui);
  transition: border-color var(--duration-quick) var(--ease-out-soft);
}

.field input:focus {
  border-color: rgb(198 160 89 / 0.6);
}

.field input.is-wrong {
  border-color: rgb(255 58 58 / 0.7);
}

.problems {
  display: block;
  text-align: start;
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text);
}

.note {
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-text-muted);
}

.action {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 1rem;
}

.dismiss {
  min-block-size: 2.75rem;
  padding-inline: 1rem;
  border-radius: var(--radius-pill);
  font-family: var(--font-ui);
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-text-faint);
  transition: color var(--duration-quick) var(--ease-out-soft);
}

.dismiss:hover {
  color: var(--color-text);
}

.dismiss:disabled {
  opacity: 0.5;
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-block-size: 2.75rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-pill);
  background-color: #ffffff;
  color: #292929;
  font-family: var(--font-ui);
  font-size: var(--text-ui);
  font-weight: 500;
  transition:
    transform var(--duration-quick) var(--ease-out-soft),
    background-color var(--duration-quick) var(--ease-out-soft);
}

.cta:hover {
  background-color: var(--color-bone);
}

.cta:active {
  transform: scale(0.98);
}

.cta:disabled {
  opacity: 0.7;
}

.receipt {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.35rem 1.5rem;
  align-items: baseline;
  padding-block: 0.25rem 0.5rem;
  text-align: start;
}

.receipt dt {
  font-size: var(--text-eyebrow);
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.receipt dd {
  font-size: var(--text-ui);
  color: var(--color-text);
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: sheen 1.4s var(--ease-in-out-soft) infinite;
}

@keyframes sheen {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
