// SDL-first schema. The /* GraphQL */ comment gives editors syntax highlighting.
export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    name: String
    notes: [Note!]!
  }

  type Note {
    id: ID!
    title: String!
    body: String!
    createdAt: String!
    author: User!
  }

  """Returned by register, login and refreshToken."""
  type AuthPayload {
    "Short-lived JWT. Send as: Authorization: Bearer <token>"
    accessToken: String!
    "Long-lived, single-use, stored in the DB. Trade it for a new pair."
    refreshToken: String!
    user: User!
  }

  type Query {
    "The logged-in user. Requires a valid access token."
    me: User!
    "Notes owned by the logged-in user."
    myNotes: [Note!]!
  }

  type Mutation {
    register(email: String!, password: String!, name: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    "Rotation: the old refresh token is deleted and a new one is returned."
    refreshToken(token: String!): AuthPayload!
    "Revokes the refresh token. The access token simply expires on its own."
    logout(token: String!): Boolean!
    createNote(title: String!, body: String!): Note!
    deleteNote(id: ID!): Boolean!
  }
`;
