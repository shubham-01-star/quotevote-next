export const TypingIndicator: string = `#graphql
  # Typing indicator type
  type TypingIndicator {
    messageRoomId: String!
    userId: String!
    user: User
    isTyping: Boolean!
    timestamp: Date!
  }

  # Typing mutation response
  type TypingResponse {
    success: Boolean!
  }
`;
