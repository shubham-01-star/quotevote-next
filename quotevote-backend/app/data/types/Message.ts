export const Message: string = `#graphql
  type Message {
    _id: ID!
    messageRoomId: String
    userAvatar: String!
    userName: String
    userId: String
    title: String
    text: String
    created: Date
    type: String
    mutation_type: String
    deleted: Boolean
    user: User
    readBy: JSON
  }
`;
