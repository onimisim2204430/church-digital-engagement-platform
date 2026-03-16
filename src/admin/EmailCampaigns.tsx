import React, { useMemo, useState } from 'react';
import './styles/EmailCampaigns.pro.css';

type Stat = {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
};

type Template = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

type Segment = {
  id: string;
  name: string;
  size: string;
  criteria: string[];
};

type Campaign = {
  id: string;
  name: string;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent';
  audience: string;
  sent: string;
  openRate: string;
  clickRate: string;
};

const stats: Stat[] = [
  { label: 'Total Subscribers', value: '24,830', change: '+6.2% this month', trend: 'up' },
  { label: 'Average Open Rate', value: '41.8%', change: '+2.4% vs last 30d', trend: 'up' },
  { label: 'Click Through Rate', value: '8.9%', change: '-0.8% vs last 30d', trend: 'down' },
  { label: 'Campaign Revenue', value: '$18,420', change: '+11.3% vs last 30d', trend: 'up' },
];

const templates: Template[] = [
  {
    id: 'welcome-series',
    name: 'Welcome Journey',
    description: '3-step onboarding flow for new members and visitors.',
    tags: ['onboarding', 'automated'],
  },
  {
    id: 'sermon-recap',
    name: 'Sermon Recap',
    description: 'Weekly recap with key points, resources, and next steps.',
    tags: ['weekly', 'content'],
  },
  {
    id: 'giving-campaign',
    name: 'Giving Campaign',
    description: 'Multi-touch campaign with impact stories and donation CTA.',
    tags: ['fundraising', 'impact'],
  },
  {
    id: 'event-launch',
    name: 'Event Launch',
    description: 'Launch sequence for event registration and reminders.',
    tags: ['events', 'registration'],
  },
  {
    id: 'prayer-wall',
    name: 'Prayer Wall Update',
    description: 'Share prayer highlights and encourage engagement.',
    tags: ['community', 'engagement'],
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    description: 'Rich newsletter with highlights, ministry updates, and links.',
    tags: ['newsletter', 'monthly'],
  },
];

const segments: Segment[] = [
  {
    id: 'new-visitors',
    name: 'New Visitors',
    size: '1,520',
    criteria: ['Joined < 30 days', 'No prior donations', 'Visited 1–2 services'],
  },
  {
    id: 'active-volunteers',
    name: 'Active Volunteers',
    size: '432',
    criteria: ['Serving monthly', 'Team leader identified', 'Volunteer tag'],
  },
  {
    id: 'weekly-attenders',
    name: 'Weekly Attenders',
    size: '7,840',
    criteria: ['Attendance ≥ 3x/month', 'Engaged in sermon notes'],
  },
  {
    id: 'generous-givers',
    name: 'Generous Givers',
    size: '2,140',
    criteria: ['Donated in last 90 days', 'Average gift > $50'],
  },
];

const campaigns: Campaign[] = [
  {
    id: 'camp-001',
    name: 'Easter Invitation Series',
    status: 'Scheduled',
    audience: 'Weekly Attenders',
    sent: 'Apr 04, 2026',
    openRate: '42.5%',
    clickRate: '9.4%',
  },
  {
    id: 'camp-002',
    name: 'March Impact Report',
    status: 'Sent',
    audience: 'All Subscribers',
    sent: 'Mar 29, 2026',
    openRate: '39.1%',
    clickRate: '7.8%',
  },
  {
    id: 'camp-003',
    name: 'Volunteer Appreciation',
    status: 'Draft',
    audience: 'Active Volunteers',
    sent: '—',
    openRate: '—',
    clickRate: '—',
  },
  {
    id: 'camp-004',
    name: 'New Member Welcome',
    status: 'Sending',
    audience: 'New Visitors',
    sent: 'Mar 30, 2026',
    openRate: '33.2%',
    clickRate: '6.4%',
  },
];

const kpiBars = [
  { label: 'Delivered', value: 92, color: 'var(--em)' },
  { label: 'Opened', value: 42, color: 'rgba(16,185,129,.7)' },
  { label: 'Clicked', value: 9, color: 'rgba(16,185,129,.45)' },
  { label: 'Converted', value: 3, color: 'rgba(16,185,129,.25)' },
];

const EmailCampaigns: React.FC = () => {
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0].id);
  const [activeSegment, setActiveSegment] = useState<string>(segments[0].id);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplate) ?? templates[0],
    [activeTemplate]
  );

  const selectedSegment = useMemo(
    () => segments.find((segment) => segment.id === activeSegment) ?? segments[0],
    [activeSegment]
  );

  return (
    <div className="email-campaigns-pro">
      <section className="ec-header">
        <div>
          <p className="ec-eyebrow">Outreach • Email Operations</p>
          <h1 className="ec-title">Email Campaign Studio</h1>
          <p className="ec-subtitle">
            Plan, build, and automate church communications across every segment — no backend
            connection required for this preview UI.
          </p>
        </div>
        <div className="ec-header-actions">
          <button className="ec-btn ec-btn-ghost">Import CSV</button>
          <button className="ec-btn">Preview Send</button>
          <button className="ec-btn ec-btn-primary">New Campaign</button>
        </div>
      </section>

      <section className="ec-stats-grid">
        {stats.map((stat) => (
          <div className="ec-card ec-stat-card" key={stat.label}>
            <div className="ec-stat-top">
              <p className="ec-stat-label">{stat.label}</p>
              <span className={`ec-pill ${stat.trend === 'up' ? 'up' : 'down'}`}>  
                {stat.trend === 'up' ? '▲' : '▼'} {stat.change}
              </span>
            </div>
            <div className="ec-stat-value">{stat.value}</div>
            <div className="ec-stat-foot">Updated a moment ago</div>
          </div>
        ))}
      </section>

      <section className="ec-grid-two">
        <div className="ec-card ec-builder">
          <div className="ec-section-head">
            <div>
              <h2>Campaign Builder</h2>
              <p>Create a polished message in minutes.</p>
            </div>
            <div className="ec-section-actions">
              <button className="ec-btn ec-btn-small">Save Draft</button>
              <button className="ec-btn ec-btn-small ec-btn-primary">Schedule</button>
            </div>
          </div>

          <div className="ec-form-grid">
            <label>
              Campaign Name
              <input type="text" placeholder="April Community Update" defaultValue="Weekly Community Update" />
            </label>
            <label>
              Subject Line
              <input type="text" placeholder="Your week at Grace Church" defaultValue="This week at Grace Church" />
            </label>
            <label>
              Preview Text
              <input type="text" placeholder="A quick snapshot of what’s ahead." defaultValue="Stories, events, and next steps." />
            </label>
            <label>
              From Name
              <input type="text" placeholder="Grace Church" defaultValue="Grace Church" />
            </label>
            <label>
              From Email
              <input type="email" placeholder="hello@gracechurch.org" defaultValue="hello@gracechurch.org" />
            </label>
            <label>
              Reply-To
              <input type="email" placeholder="team@gracechurch.org" defaultValue="team@gracechurch.org" />
            </label>
            <label>
              Audience Segment
              <select defaultValue="Weekly Attenders">
                <option>Weekly Attenders</option>
                <option>New Visitors</option>
                <option>Active Volunteers</option>
                <option>Generous Givers</option>
              </select>
            </label>
            <label>
              Send Mode
              <div className="ec-toggle-row">
                <button className="ec-toggle active">Schedule</button>
                <button className="ec-toggle">Send Now</button>
                <button className="ec-toggle">Drip Sequence</button>
              </div>
            </label>
            <label>
              Schedule Date
              <input type="date" defaultValue="2026-04-04" />
            </label>
            <label>
              Schedule Time
              <input type="time" defaultValue="09:30" />
            </label>
            <label>
              A/B Testing
              <div className="ec-toggle-row">
                <button className="ec-toggle active">Enabled</button>
                <button className="ec-toggle">Disabled</button>
              </div>
            </label>
            <label>
              UTM Tracking
              <div className="ec-toggle-row">
                <button className="ec-toggle active">On</button>
                <button className="ec-toggle">Off</button>
              </div>
            </label>
            <label className="span-2">
              Notes for the team
              <textarea rows={4} defaultValue="Add sermon recap, giving impact story, and volunteer call-to-action." />
            </label>
          </div>
        </div>

        <div className="ec-card ec-side-panel">
          <div className="ec-section-head">
            <div>
              <h2>Audience Health</h2>
              <p>Snapshot of deliverability and engagement.</p>
            </div>
          </div>
          <div className="ec-health-grid">
            <div>
              <p>Deliverability Score</p>
              <h3>97%</h3>
              <span className="ec-muted">+1.2% this week</span>
            </div>
            <div>
              <p>List Growth</p>
              <h3>+428</h3>
              <span className="ec-muted">New subscribers this month</span>
            </div>
            <div>
              <p>Bounce Rate</p>
              <h3>0.6%</h3>
              <span className="ec-muted">Below industry benchmark</span>
            </div>
            <div>
              <p>Unsubscribe Rate</p>
              <h3>0.2%</h3>
              <span className="ec-muted">Stable for 6 weeks</span>
            </div>
          </div>

          <div className="ec-divider" />

          <div className="ec-section-head">
            <div>
              <h2>Compliance Checklist</h2>
              <p>Keep every send safe and respectful.</p>
            </div>
          </div>
          <ul className="ec-checklist">
            <li>✓ Unsubscribe link included</li>
            <li>✓ Sender domain verified</li>
            <li>✓ Content scan complete</li>
            <li>✓ GDPR/CCPA tags applied</li>
          </ul>
        </div>
      </section>

      <section className="ec-grid-two">
        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Segmentation Engine</h2>
              <p>Select a segment or build a new one.</p>
            </div>
            <div className="ec-section-actions">
              <button className="ec-btn ec-btn-small">New Segment</button>
            </div>
          </div>

          <div className="ec-segment-grid">
            {segments.map((segment) => (
              <button
                key={segment.id}
                className={`ec-segment-card ${activeSegment === segment.id ? 'active' : ''}`}
                onClick={() => setActiveSegment(segment.id)}
                type="button"
              >
                <div>
                  <h3>{segment.name}</h3>
                  <p>{segment.size} people</p>
                </div>
                <span className="ec-pill">View</span>
              </button>
            ))}
          </div>

          <div className="ec-segment-details">
            <h3>{selectedSegment.name}</h3>
            <p className="ec-muted">Key criteria used to build this segment:</p>
            <ul>
              {selectedSegment.criteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
            <div className="ec-inline-actions">
              <button className="ec-btn ec-btn-small">Duplicate</button>
              <button className="ec-btn ec-btn-small">Export</button>
              <button className="ec-btn ec-btn-small ec-btn-primary">Apply Segment</button>
            </div>
          </div>
        </div>

        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Template Gallery</h2>
              <p>Choose a template to jumpstart your campaign.</p>
            </div>
            <div className="ec-section-actions">
              <button className="ec-btn ec-btn-small">Upload HTML</button>
            </div>
          </div>

          <div className="ec-template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`ec-template-card ${activeTemplate === template.id ? 'active' : ''}`}
                onClick={() => setActiveTemplate(template.id)}
                type="button"
              >
                <div className="ec-template-preview">
                  <div className="ec-template-line" />
                  <div className="ec-template-line short" />
                  <div className="ec-template-block" />
                </div>
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="ec-template-tags">
                    {template.tags.map((tag) => (
                      <span key={tag} className="ec-pill">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="ec-template-spotlight">
            <div>
              <h3>{selectedTemplate.name}</h3>
              <p>{selectedTemplate.description}</p>
              <div className="ec-inline-actions">
                <button className="ec-btn ec-btn-small">Edit Blocks</button>
                <button className="ec-btn ec-btn-small">Save as Template</button>
              </div>
            </div>
            <button className="ec-btn ec-btn-primary">Use Template</button>
          </div>
        </div>
      </section>

      <section className="ec-grid-two">
        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Email Preview</h2>
              <p>Desktop and mobile previews auto‑rendered.</p>
            </div>
          </div>

          <div className="ec-preview-grid">
            <div className="ec-preview">
              <div className="ec-preview-header">Desktop Preview</div>
              <div className="ec-preview-body">
                <h4>Grace Church Weekly Update</h4>
                <p>We’re celebrating 42 baptisms this month and launching two new small groups.</p>
                <div className="ec-preview-cta">Read the full update →</div>
              </div>
            </div>
            <div className="ec-preview mobile">
              <div className="ec-preview-header">Mobile Preview</div>
              <div className="ec-preview-body">
                <h4>Grace Church Weekly Update</h4>
                <p>Catch the highlights, upcoming events, and how to get involved.</p>
                <div className="ec-preview-cta">Open on mobile →</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Automation Flow</h2>
              <p>Configure the drip sequence and follow‑ups.</p>
            </div>
            <div className="ec-section-actions">
              <button className="ec-btn ec-btn-small">Add Step</button>
            </div>
          </div>

          <ol className="ec-flow">
            <li>
              <span className="ec-flow-dot" />
              <div>
                <h4>Day 0 — Welcome email</h4>
                <p>Sent immediately after signup with a personalized greeting.</p>
              </div>
              <span className="ec-pill">Active</span>
            </li>
            <li>
              <span className="ec-flow-dot" />
              <div>
                <h4>Day 2 — Discover groups</h4>
                <p>Invite new members to join small groups or ministries.</p>
              </div>
              <span className="ec-pill">Queued</span>
            </li>
            <li>
              <span className="ec-flow-dot" />
              <div>
                <h4>Day 7 — Giving impact</h4>
                <p>Share impact stories and highlight giving opportunities.</p>
              </div>
              <span className="ec-pill">Queued</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="ec-grid-two">
        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Performance Analytics</h2>
              <p>Monitor conversion trends across the funnel.</p>
            </div>
            <div className="ec-section-actions">
              <button className="ec-btn ec-btn-small">Export</button>
            </div>
          </div>

          <div className="ec-kpi">
            {kpiBars.map((bar) => (
              <div key={bar.label} className="ec-kpi-row">
                <div className="ec-kpi-label">
                  <span>{bar.label}</span>
                  <span>{bar.value}%</span>
                </div>
                <div className="ec-kpi-bar">
                  <div className="ec-kpi-fill" style={{ width: `${bar.value}%`, background: bar.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="ec-inline-actions">
            <button className="ec-btn ec-btn-small">View Heatmap</button>
            <button className="ec-btn ec-btn-small ec-btn-primary">Share Report</button>
          </div>
        </div>

        <div className="ec-card">
          <div className="ec-section-head">
            <div>
              <h2>Recent Campaigns</h2>
              <p>Track drafts, sends, and active sequences.</p>
            </div>
          </div>

          <div className="ec-table">
            <div className="ec-table-head">
              <span>Campaign</span>
              <span>Status</span>
              <span>Audience</span>
              <span>Sent</span>
              <span>Open</span>
              <span>Click</span>
            </div>
            {campaigns.map((campaign) => (
              <div className="ec-table-row" key={campaign.id}>
                <span>{campaign.name}</span>
                <span className={`ec-status ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
                <span>{campaign.audience}</span>
                <span>{campaign.sent}</span>
                <span>{campaign.openRate}</span>
                <span>{campaign.clickRate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailCampaigns;