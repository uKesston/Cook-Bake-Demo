# AGENTS.md — kb/ (the assistant's knowledge base)

Rules for this folder only. They add to the root AGENTS.md.

- One brochure per course: kb/brochures/<CODE>.md, e.g. BAK-101.md.
- Start with "# <Title> (<CODE>)", then these "## " sections, in order:
  Overview · What you will learn · Schedule, fee and class size · Where ·
  Allergens and what to bring · How to sign up
- The build splits documents on "## ", so each section must stand alone —
  repeat the course name in any sentence that would be ambiguous alone.
- Fees and intake dates must match data/courses.json exactly.
- State allergens plainly. If a course is unsafe for an allergy, say
  "not suitable for <allergy>".
- After any change here, run `npm run check` and keep it at 30/30.
