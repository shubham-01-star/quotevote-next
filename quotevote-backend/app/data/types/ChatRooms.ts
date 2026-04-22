export const ChatRoom: string = `#graphql
  type ChatRoom {
    _id: ID!
    users: JSON
    messageType: String
    created: Date
    unreadMessages: Int
    user: User
  }
`;
