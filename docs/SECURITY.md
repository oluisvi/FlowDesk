# Security

Keep credentials and production connection strings outside version control. `.env.example` lists development variable names only and contains no secrets.

Future workspace-scoped API work must enforce authorization on the server and must not trust a client-supplied workspace identifier.
