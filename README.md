# n8n-nodes-banger

This is an n8n community node for [Banger](https://bangermail.com), company email your AI runs. It lets you send Product email, keep contacts and contact lists up to date, run Journeys and start workflows from Banger events.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Demo](#demo)
- [Installation](#installation)
- [Operations](#operations)
- [Trigger](#trigger)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Resources](#resources)
- [Version history](#version-history)

## Demo

https://github.com/user-attachments/assets/a5ecca98-f29b-4613-9ea3-4e96da728d1d

A 2:45 walkthrough in n8n 2.42.4: install the node from npm, create the Banger credential and pass its test, create a contact and add it to a list, send a Product email, and let an AI Agent look up a contact with the Banger tool.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In n8n, open **Settings > Community Nodes**, choose **Install**, and enter `n8n-nodes-banger`.

## Operations

**Email**

- **Send**: send a Product email from a domain set up in Banger. Uses Banger's Resend-compatible `POST /emails` endpoint.

**Contact**

- **Create or Update**: add a contact to your audience, or update the contact with the same email. Set the subscription status, display name, attributes and consent evidence.
- **Get**: read a contact, by picking it from a list, by email or by ID.
- **Add to List**: add a contact to a contact list.
- **Remove From List**: remove a contact from a contact list.

**Journey**

- **Send Email**: send the email of an API Journey to one recipient. For a Journey whose content Banger manages, pass the variables it uses. For a Journey whose content comes from your code, set Subject and HTML or Text under **Additional Fields** instead. Replies go to the Journey's mailbox unless you set Reply To. Your Journeys page shows each API Journey's key.
- **Enroll Contact**: start a Journey for a contact. Depending on your workspace's review settings, Banger may hold the enrollment in Approvals until a person decides. The output includes the approval and its status.
- **Get Many**: list Journeys, filtered by status, trigger or name.
- **Send Event**: send an event, such as `signup` or `trial_started`, for a person. Active Journeys whose trigger listens for it start for that person; Journeys whose goal is that event stop. Those Journeys send email. Add attributes the Journey can read, and an event ID if your system has one: Banger handles each ID once.

**Workspace**

- **Get**: read the workspace of the API key, with the scopes the key holds.

Every write sends an `Idempotency-Key`, built from the execution, node, run and item. If n8n retries a node, Banger replays the first result instead of sending or enrolling twice. You can set your own key under **Additional Fields**.

The Banger node can also be used as a tool by n8n's AI Agent.

## Trigger

**Banger Trigger** starts a workflow when something changes in Banger. When you activate the workflow, the node registers an outgoing webhook in your Banger workspace. When you deactivate it, the node removes the webhook.

Events you can subscribe to:

| Event | When it fires |
| --- | --- |
| Mailbox Activity (`mail.changed`) | A mailbox, thread, message, draft or work item changes, including new inbound email |
| Sending Activity (`send.changed`) | Sending or deliverability activity changes |
| Broadcast Activity (`campaign.changed`) | A Broadcast changes |
| Customer Activity (`audience.changed`) | Contact or audience data changes |
| Approval Activity (`approval.changed`) | An approval request changes |
| Rule Activity (`automation.changed`) | Banger publishes an update to its automation rules |
| Domain Activity (`domain.changed`) | A sending domain changes |
| Sender Reputation Warning, Sending Lane Paused, Sending Domain Paused, Mailbox Sending Paused, Workspace Sending Frozen, Sending Resumed | Changes to your sender reputation and sending state |
| Email Received (`mail.received`) | A new email arrived in a mailbox |
| Email Sent From a Mailbox (`mail.sent`) | A mailbox sent an email |
| Email Delivered (`send.delivered`) | The receiving server accepted a Product, Broadcast or Journey email (one event per recipient) |
| Email Bounced (`send.bounced`) | A Product, Broadcast or Journey email bounced |
| Spam Complaint (`send.complained`) | A recipient marked an email as spam |
| Journey: Person Entered, Finished, Left (`journey.enrolled`, `journey.completed`, `journey.exited`) | A person started, finished or left a Journey |

The specific events (Email and Journey) carry what a workflow acts on: IDs, people's addresses and the subject, never the email body. For example:

```json
{
  "id": "7c0c…",
  "type": "mail.received",
  "created_at": "2026-10-07T12:00:00.000Z",
  "workspace_id": "6f1d…",
  "product_id": "2a7e…",
  "data": {
    "mailbox_id": "c1a2…",
    "mailbox_address": "support@acme.com",
    "thread_id": "d4e5…",
    "message_id": "f6a7…",
    "subject": "Question about order 1492",
    "received_at": "2026-10-07T11:59:58.000Z",
    "from": { "email": "nathan@example.com", "name": "Nathan" },
    "in_reply_to_send_id": null
  },
  "delivery_id": "9e3b…"
}
```

The activity events are a short notice with the IDs involved, for example:

```json
{
  "id": "0b6f…",
  "type": "mail.changed",
  "created_at": "2026-10-07T12:00:00.000Z",
  "workspace_id": "6f1d…",
  "data": { "revision": 412, "topics": ["threads", "messages"], "mailbox_ids": ["c1a2…"] },
  "delivery_id": "9e3b…"
}
```

Add a Banger node, or an HTTP Request node with the Banger credential, after the trigger to read the details.

The trigger checks Banger's signature on every request (`banger-webhook-signature`, HMAC-SHA256 over the timestamp and body) and rejects requests that are unsigned, altered or more than five minutes old.

Banger only delivers to public HTTPS URLs. A local n8n on `localhost` needs a tunnel, or `N8N_WEBHOOK_URL` set to a public HTTPS address, to receive events.

## Credentials

The node uses a Banger workspace API key.

1. Sign in to [Banger](https://bangermail.com).
2. Open **API keys** in the sidebar and choose **Create API key**.
3. Give the key a name and choose the scopes your workflows need (see below).
4. Copy the key. It starts with `bgr_` and is shown once.
5. In n8n, create a **Banger API** credential and paste the key.

n8n tests the key against `GET https://api.bangermail.com/v1/bootstrap`.

An API key belongs to one workspace and one product. Scopes needed by each operation:

| Operation | Scopes |
| --- | --- |
| Email: Send | `mail:send` |
| Contact: Create or Update | `contacts:write` |
| Contact: Get | `contacts:read` |
| Contact: Add to List, Remove From List | `contacts:write`, plus `contacts:read` to pick a contact or list from a list or by email |
| Journey: Send Email | `mail:send`, plus `campaigns:read` to pick the Journey from a list |
| Journey: Enroll Contact | `campaigns:send`, plus `campaigns:read` and `contacts:read` to pick from a list or by email |
| Journey: Get Many | `campaigns:read` |
| Journey: Send Event | `automation:execute` |
| Workspace: Get | any scope |
| Banger Trigger | `automation:read`, `automation:execute` |
| Product and Mailbox pickers | `mail:read` |

A key with `workspace:admin` passes every scope check.

## Compatibility

Tested with n8n 2.42.4.

## Usage

**Send a receipt after a payment.** Stripe Trigger, then Banger (Email: Send) with `From` set to an address on your Product email domain and `Reply To` set to your support address. Banger needs a reply-to address on every Product email.

**Add sign-ups to your audience.** Form Trigger, then Banger (Contact: Create or Update) with **Subscription Status** set to Subscribed and **Consent Confirmed** on, then Banger (Contact: Add to List).

**Start onboarding.** Banger (Journey: Send Email) with your welcome Journey's key and variables such as `first_name`.

**Start a trial Journey.** Your app's webhook, then Banger (Journey: Send Event) with **Event Type** `trial_started` and the customer's email. Every active Journey triggered by `trial_started` starts for them.

An API key made for one product always works in that product, so leave **Product** empty. Set it only with a workspace-wide key in a workspace that has more than one product.

Prefer to let an AI agent operate Banger? Banger also runs as an MCP server that n8n's MCP Client Tool can use. See [Banger in n8n](https://bangermail.com/agents/n8n/).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Banger API reference](https://bangermail.com/api.md)
- [Banger in n8n with MCP](https://bangermail.com/agents/n8n/)
- [Banger](https://bangermail.com)

## Version history

### 0.2.0

- Journey: Send Event.
- Banger Trigger: Email Received, Email Sent From a Mailbox, Email Delivered, Email Bounced, Spam Complaint, and Journey Person Entered, Finished and Left events.
- Banger Trigger: re-activating a workflow replaces the webhook its earlier activation left behind instead of failing on the taken name.
- Journey: Send Email no longer needs Reply To: replies go to the Journey's mailbox.
- Email: Send no longer needs Product for an API key made for one product.

Needs the Banger API of October 2026 or later.

### 0.1.1

First release: Email (Send), Contact (Create or Update, Get, Add to List, Remove From List), Journey (Send Email, Enroll Contact, Get Many), Workspace (Get) and Banger Trigger.
