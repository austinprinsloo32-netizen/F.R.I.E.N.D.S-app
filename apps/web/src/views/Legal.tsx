import type { ReactNode } from 'react'
import { navigate } from '../lib/route'
import { CONTACT_EMAIL, HELPLINES, OPERATOR_NAME, POLICY_UPDATED, SITE_NAME } from '../lib/site'
import Icon from '../components/Icon'

type Which = 'rules' | 'privacy'

function Helplines() {
  return (
    <div className="legal-callout">
      <strong>If you or someone else needs to talk to someone now</strong>
      <ul>
        {HELPLINES.map((line) => (
          <li key={line.number}>
            <span>{line.name}</span>
            <a href={`tel:${line.number.replace(/\s/g, '')}`}>{line.number}</a>
            <small>{line.note}</small>
          </li>
        ))}
      </ul>
      <small>
        If someone is in immediate danger, contact your local emergency services. Numbers can change, so check them
        if one does not connect.
      </small>
    </div>
  )
}

function Rules() {
  return (
    <>
      <p className="lead">
        {SITE_NAME} helps adults make real friends. These rules keep it kind and safe. By using the app you agree to
        follow them.
      </p>

      <h3>1. Be kind</h3>
      <p>
        Treat people the way you would want to be treated. No harassment, bullying, hate, threats or humiliating
        people. You can disagree, politely.
      </p>

      <h3>2. Be real</h3>
      <p>
        Use your own photos and a name people can call you. Do not pretend to be someone else, run more than one
        account or make a fake profile. You must be 18 or older.
      </p>

      <h3>3. Respect “no”</h3>
      <p>
        If someone does not reply or says no, stop. No pressure and no repeated messages. {SITE_NAME} is for
        friendship, so sexual messages, soliciting and pressure to date are not allowed.
      </p>

      <h3>4. Protect privacy</h3>
      <p>
        Do not share anyone’s private details, photos or messages without their permission. Do not post screenshots
        of private conversations.
      </p>

      <h3>5. Keep it honest and legal</h3>
      <p>
        No scams, spam, selling, recruiting or promotion. No illegal content. Nothing that encourages violence or
        self-harm.
      </p>

      <h3>6. Meeting in person</h3>
      <p>
        Plans are organised by members, not by {SITE_NAME}, and we do not check anyone’s background. To stay safe:
      </p>
      <ul>
        <li>Meet in a public place the first time.</li>
        <li>Tell someone you trust where you are going and who with.</li>
        <li>Arrange your own transport, and leave if you feel uncomfortable.</li>
        <li>Only share your exact location when you choose to.</li>
      </ul>
      <p>
        If you host a plan, be honest about the time, place and who is coming, and cancel it if you cannot make it.
      </p>

      <h3>7. Support and sensitive topics</h3>
      <p>
        Friends can listen, but members are not therapists, and {SITE_NAME} is not a crisis or medical service. If
        you are struggling, please talk to someone who is trained to help.
      </p>
      <Helplines />

      <h3>8. Reporting and blocking</h3>
      <p>
        Use the “⋯” menu on a profile, an update or a conversation to report or block someone. Blocking is private:
        they are not told. Reports are read by the {SITE_NAME} team. Depending on what happened, we may give a
        warning, remove content or remove an account, and where we can we will tell you the outcome. For serious
        safety concerns we may act straight away.
      </p>

      <h3>9. Questions or appeals</h3>
      <p>
        If you think we got a decision wrong, or you have a question, write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <p className="lead">
        This page explains, in plain words, what {SITE_NAME} collects, who can see it and what your choices are. It is
        written with South Africa’s Protection of Personal Information Act (POPIA) in mind.
      </p>

      <h3>Who is responsible</h3>
      <p>
        {OPERATOR_NAME} runs {SITE_NAME} and decides how your information is used. Questions, requests and complaints
        go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h3>What we collect</h3>
      <ul>
        <li>
          <strong>Your account:</strong> your email address and a password. Your password is handled by our sign-in
          provider and we never see it.
        </li>
        <li>
          <strong>Your profile:</strong> your name, bio, general location, interests, profile photo, any extra photos
          and your “Ask me about” answers. Please keep your location general, such as a town, not an address.
        </li>
        <li>
          <strong>What you do in the app:</strong> friend requests, messages, statuses, updates, reactions, plans you
          host or join, people you block and reports you send.
        </li>
        <li>
          <strong>Technical data:</strong> basic logs kept by our hosting and database providers, such as your IP
          address and when you signed in.
        </li>
      </ul>

      <h3>Who can see what</h3>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Information</th>
            <th>Who can see it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name, bio, location, interests, profile photo, “Ask me about” answers, badges</td>
            <td>Other members who are signed in</td>
          </tr>
          <tr>
            <td>Extra photos, statuses, updates, plans</td>
            <td>You and your friends</td>
          </tr>
          <tr>
            <td>Reactions to an update</td>
            <td>You, and the person who posted it</td>
          </tr>
          <tr>
            <td>Messages</td>
            <td>You and the person you are talking to</td>
          </tr>
          <tr>
            <td>People you have blocked</td>
            <td>Only you</td>
          </tr>
          <tr>
            <td>Reports you send</td>
            <td>You and the {SITE_NAME} team</td>
          </tr>
        </tbody>
      </table>
      <p>
        Messages are not end-to-end encrypted. We do not read them as a routine, but someone with access to our
        database could. We only look when it is needed for safety, such as dealing with a report, or when the law
        requires it.
      </p>

      <h3>Why we use it</h3>
      <p>
        To run the app, show you people with similar interests, keep members safe, deal with reports, and understand
        whether the app is working, for example how many new members make a friend in their first week. We do not sell
        your information and we do not show adverts. We do not currently use advertising trackers.
      </p>

      <h3>Photo checks</h3>
      <p>
        If you ask for a “Photo checked” badge, a member of the team looks at your profile photo by hand. We do not
        store a face scan or any biometric data, and you do not upload a selfie for this.
      </p>

      <h3>Where it is kept</h3>
      <p>
        Your information is stored with our database and sign-in provider (Supabase) and our website host. Their servers
        may be outside South Africa. We choose providers that protect data and we limit who on our side can access it.
      </p>

      <h3>How long we keep it, and deleting it</h3>
      <p>
        You can edit your profile, remove photos and delete your updates at any time. To delete your account and the
        information tied to it, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you
        signed up with. An in-app delete button is planned. We may keep a record of a report where that is needed to
        keep other members safe.
      </p>

      <h3>Your rights</h3>
      <p>
        You can ask to see the information we hold about you, ask us to correct or delete it, and object to how we use
        it. If you are unhappy with how we handled a request, you can complain to the Information Regulator
        (South Africa).
      </p>

      <h3>Age</h3>
      <p>{SITE_NAME} is for people aged 18 and over. If we learn that someone under 18 has joined, we will remove their account.</p>

      <h3>Changes</h3>
      <p>If we change this page in a way that matters, we will tell members in the app. The date at the top shows the latest version.</p>
    </>
  )
}

export default function Legal({ which, standalone = false }: { which: Which; standalone?: boolean }) {
  const title = which === 'rules' ? 'Community rules' : 'Privacy'
  const other: { view: Which; label: string } =
    which === 'rules' ? { view: 'privacy', label: 'Privacy' } : { view: 'rules', label: 'Community rules' }

  const body: ReactNode = which === 'rules' ? <Rules /> : <Privacy />

  return (
    <div className={standalone ? 'legal-public' : ''}>
      {standalone && (
        <header className="legal-bar">
          <a className="brand" href="#/dashboard" aria-label={`${SITE_NAME} home`}>
            <span className="brand-mark">f.</span>
            <span>{SITE_NAME}</span>
          </a>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('dashboard')}>
            <Icon name="arrowLeft" size={16} /> Back to log in
          </button>
        </header>
      )}
      <article className="page page-narrow legal">
        <h2 className="page-title">{title}</h2>
        <p className="muted">Last updated {POLICY_UPDATED}</p>
        {body}
        <p className="legal-foot">
          <button type="button" className="link-btn" onClick={() => navigate(other.view)}>
            {other.label}
          </button>
        </p>
      </article>
    </div>
  )
}
