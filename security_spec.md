# Security Specification - Ignitia Nexus

This document defines the security configuration and access constraints for the Firestore backend.

## 1. Data Invariants
- **GameStateGlobal**: Can only be altered by the designated administrative email (`aniketjaiswal621@gmail.com`). Game-active state is a boolean, and startedAt tracks milliseconds since epoch or is null when locked.
- **Participant Record**: Each authenticated user may only register a single participant document matching their authenticated UID (`userId == request.auth.uid`). Once registered, they cannot self-adjust their immutable properties (identity attributes like name and email are lock-guarded on update).

## 2. Dynamic Ruleset Definition (firestore.rules)
Refer to `/firestore.rules` for the implemented Zero-Trust Attribute-Based Access Control list.
