## Purpose

Lets real Instagram customers reach Gina by DM: receives Meta's webhook events, verifies them, feeds each message through the existing core pipeline, and sends Gina's reply back through Instagram's Send API.

## ADDED Requirements

### Requirement: Webhook verification challenge
The system SHALL respond to Meta's webhook verification request (a GET request carrying a verify token and a challenge value) by echoing back the challenge only when the verify token matches the configured value.

#### Scenario: Valid verification request
- **WHEN** Meta sends a GET verification request with the correct verify token
- **THEN** the system SHALL respond with the challenge value from the request

#### Scenario: Invalid verify token
- **WHEN** a GET verification request carries a verify token that does not match the configured value
- **THEN** the system SHALL reject the request and SHALL NOT echo the challenge

### Requirement: Incoming webhook signature verification
The system SHALL verify the signature of every incoming webhook POST request against the configured app secret, and SHALL reject any request whose signature does not match without processing its content.

#### Scenario: Invalid signature
- **WHEN** an incoming webhook POST request's signature does not match what is expected for the configured app secret
- **THEN** the system SHALL reject the request and SHALL NOT run it through the core pipeline

### Requirement: Instagram message reaches the existing core pipeline unchanged
The system SHALL convert a verified incoming Instagram DM into a customer identity and message text, and SHALL process it using the same intent-extraction, memory, and reply-generation behavior already specified for other channels, without special-casing Instagram in that pipeline.

#### Scenario: New Instagram customer sends a first DM
- **WHEN** a verified webhook event contains a DM from an Instagram-scoped sender id not seen before
- **THEN** the system SHALL identify the customer using that sender id as the platform user id and platform "instagram", and SHALL process the message through the existing extraction, memory, and reply behavior

### Requirement: Reply delivery via Instagram
The system SHALL send Gina's generated text reply back to the customer via Instagram's messaging API, addressed to the same sender the incoming DM came from.

#### Scenario: Successful reply
- **WHEN** a reply has been generated for a verified incoming Instagram DM
- **THEN** the system SHALL send that reply text back to the originating sender via Instagram's Send API

### Requirement: No media sent by this capability
The system SHALL send only text replies through Instagram; it SHALL NOT attempt to send images or videos, consistent with persona-reply's existing behavior of disclosing that media isn't available yet.

#### Scenario: Customer requests photos over Instagram DM
- **WHEN** a customer's Instagram DM has intent `media_request`
- **THEN** the system SHALL send only the text reply produced by the existing persona-reply behavior, and SHALL NOT attempt to attach or send any image or video
