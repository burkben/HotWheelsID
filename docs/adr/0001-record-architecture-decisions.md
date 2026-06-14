# 1. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers

## Context

HotWheelsID is a fork of the `hotwheels-portal` Python project. We are changing its
direction substantially: from a desktop terminal tool into a polished, cross-platform
mobile app that is installable on iOS. Decisions of this scale (platform, language,
Bluetooth stack, distribution) have long-lived consequences and need to be explained to
future contributors — and to our future selves.

We want a record of **why** each major choice was made, including the alternatives we
rejected, so we don't re-litigate settled questions or accidentally undo a deliberate
trade-off.

## Decision

We will keep a log of Architecture Decision Records (ADRs) in `docs/adr/`, using the
lightweight Nygard format: a title, a status, and the sections *Context*, *Decision*,
*Consequences*, and (where useful) *Alternatives considered*.

ADRs are numbered sequentially and are immutable once accepted. A decision that overturns
an earlier one is recorded as a **new** ADR that supersedes the old.

## Consequences

- New contributors can read `docs/adr/` top to bottom and understand the shape of the
  system and the reasoning behind it.
- Decisions get a small amount of up-front rigor, which is healthy for a project that is
  pivoting platforms.
- There is a minor ongoing cost: significant changes should come with an ADR.

## Alternatives considered

- **No formal record (tribal knowledge / commit messages).** Rejected: the platform
  pivot involves several interlocking decisions that are hard to reconstruct from diffs.
- **A single `ARCHITECTURE.md` that is edited in place.** Useful for the *current* state
  (we keep one under `docs/architecture/`), but it loses the history of *why*. ADRs and
  the architecture overview are complementary.
