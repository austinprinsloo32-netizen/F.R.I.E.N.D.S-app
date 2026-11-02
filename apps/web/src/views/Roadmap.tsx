import Icon, { type IconName } from '../components/Icon'
import { navigate } from '../lib/route'

type Which = 'communities' | 'activities' | 'support'

const content: Record<
  Which,
  { icon: IconName; title: string; tagline: string; points: string[]; note?: string }
> = {
  communities: {
    icon: 'circles',
    title: 'Communities',
    tagline: 'Shared interests, shared spaces.',
    points: [
      'Join groups around hobbies, identities and goals',
      'Discussions, posts and moderated group spaces',
      'A path from a shared interest to a group activity',
    ],
  },
  activities: {
    icon: 'calendar',
    title: 'Activities',
    tagline: 'Turn online hellos into real-life plans.',
    points: [
      'Find or organise outings, with invitations and attendance',
      'Clear organiser details and cancellation rules',
      'Public-meeting guidance and reporting built in',
    ],
  },
  support: {
    icon: 'heart',
    title: 'Support',
    tagline: 'Guided listening, with clear boundaries.',
    points: [
      'Volunteer and paid listening, described clearly',
      'Vetting, training and safeguarding before launch',
    ],
    note: 'Listening is not therapy, medical care or crisis support. If you or someone else is in immediate danger, contact your local emergency services.',
  },
}

export default function Roadmap({ which }: { which: Which }) {
  const item = content[which]
  return (
    <div className="page page-narrow">
      <section className="roadmap">
        <span className="roadmap-icon">
          <Icon name={item.icon} size={30} />
        </span>
        <span className="status-pill">On the roadmap</span>
        <h2 className="page-title">{item.title}</h2>
        <p className="lead">{item.tagline}</p>

        <ul className="roadmap-points">
          {item.points.map((point) => (
            <li key={point}>
              <span className="tick">
                <Icon name="check" size={12} />
              </span>
              {point}
            </li>
          ))}
        </ul>

        {item.note && <p className="roadmap-note">{item.note}</p>}

        <p className="muted">
          We’re building the friendship basics first: discovery, requests and messaging. This area
          isn’t live yet.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('discover')}>
          Back to Discover
        </button>
      </section>
    </div>
  )
}
