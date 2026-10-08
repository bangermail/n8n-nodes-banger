# Changelog

## 0.2.0

- Journey: Send Event (`POST /v1/workspaces/{id}/events`): starts or ends the Journeys listening for an event.
- Banger Trigger: specific events `mail.received`, `mail.sent`, `send.delivered`, `send.bounced`, `send.complained`, `journey.enrolled`, `journey.completed` and `journey.exited`, with the IDs, addresses and subject a workflow needs.
- Banger Trigger: when Banger answers `webhook_name_taken` because an earlier activation of the workflow left its webhook behind, the trigger deletes that webhook and registers again. Deactivating now deletes the webhook for good.
- Journey: Send Email documents that Reply To defaults to the Journey's mailbox.
- Email: Send's Product field is optional help: a product API key always sends as its product.
- Clearer errors for `webhook_name_taken` and `product_reply_to_required`.

Needs the Banger API of October 2026 or later.

## 0.1.1

First release on npm. 0.1.0 was tagged but never published: npm needs `publishConfig.access: public` to attach provenance to a new package.

## 0.1.0

First release.

- Banger API credential (workspace API key)
- Banger node: Email (Send), Contact (Create or Update, Get, Add to List, Remove From List), Journey (Send Email, Enroll Contact, Get Many), Workspace (Get)
- Banger Trigger: signed outgoing webhooks for Mailbox, Sending, Broadcast, Customer, Approval, Rule, Domain and sender-reputation events
