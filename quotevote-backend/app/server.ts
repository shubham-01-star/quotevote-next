import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GraphQLError } from 'graphql';
import { solidResolvers } from './data/resolvers/solidResolvers';
import { addPost } from './data/resolvers/mutations/post/addPost';
import { createGroup } from './data/resolvers/mutations/group/createGroup';
import { getGroups } from './data/resolvers/queries/group/getGroups';
import type { GraphQLContext, PubSub } from './types/graphql';
import { requireAuth } from './data/utils/requireAuth';
import { pubsub } from './data/utils/pubsub';
import { startPresenceCleanup } from './data/utils/presence/cleanupStalePresence';
import * as auth from './data/utils/authentication';
import User from './data/models/User';
import type * as Common from './types/common';

// Use shared pubsub instance referencing the import
const noOpPubSub: PubSub = pubsub;

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Environment Variables
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quotevote';

async function startServer() {
  // 1. Database Connection (Mongoose v9)
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }

  // Start Presence Cleanup Job
  startPresenceCleanup();

  // 2. Apollo Server Setup (v4/v5 Syntax)
  const server = new ApolloServer<GraphQLContext>({
    typeDefs: `
      scalar JSON
      scalar Date

      type Query {
        hello: String
        status: String
        solidConnectionStatus: SolidConnectionStatus
        groups(limit: Int): [Group]
      }

      type Mutation {
        addPost(post: PostInput!): Post
        createGroup(group: GroupInput!): Group

        solidStartConnect(issuer: String!): SolidConnectResult
        solidFinishConnect(code: String!, state: String!, redirectUri: String!): SolidConnectResult
        solidDisconnect: Boolean
        solidPullPortableState: PortableState
        solidPushPortableState(input: PortableStateInput!): Boolean
        solidAppendActivityEvent(input: ActivityEventInput!): Boolean
      }

      type Group {
        _id: String!
        creatorId: String!
        adminIds: [String]
        allowedUserIds: [String]
        privacy: String!
        title: String!
        url: String
        description: String
        created: String
      }

      type Post {
        _id: String
        userId: String
        groupId: String
        title: String
        text: String
        url: String
        citationUrl: String
        upvotes: Int
        downvotes: Int
        deleted: Boolean
        created: String
      }

      input PostInput {
        userId: String!
        groupId: String!
        title: String!
        text: String!
        citationUrl: String
      }

      input GroupInput {
        creatorId: String!
        title: String!
        description: String!
        privacy: String!
        url: String
      }

      type SolidConnectionStatus {
        connected: Boolean
        webId: String
        issuer: String
        lastSyncAt: String
      }

      type SolidConnectResult {
        authorizationUrl: String
        success: Boolean
        webId: String
        issuer: String
        message: String
      }

      type PortableState {
        version: String
        collections: [JSON]
      }

      input PortableStateInput {
        version: String
        collections: [JSON]
      }

      input ActivityEventInput {
        type: String!
        payload: JSON!
        timestamp: String
      }
    `,
    resolvers: [
      {
        Query: {
          hello: () => 'Hello from TypeScript Backend! 🚀',
          status: () => 'Active',
          groups: getGroups,
        },
        Mutation: {
          addPost,
          createGroup,
        },
      },
      solidResolvers
    ],
  });

  await server.start();

  // 3. Middleware & Routes Integration
  app.use(cors<cors.CorsRequest>());
  app.use(express.json());

  // Auth Routes
  app.post('/auth/register', auth.register);
  app.post('/auth/login', auth.login);
  app.post('/auth/refresh', auth.refresh);
  app.post('/auth/guest', auth.createGuestUser);

  // GraphQL Integration
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const token = req.headers.authorization?.split(' ')[1];
        let user = null;

        // Check if this is an introspection query (GraphQL Playground/IDE)
        const isIntrospection = req.body?.operationName === 'IntrospectionQuery';

        if (token) {
          try {
            const decoded = await auth.verifyToken(token);
            if (decoded && typeof decoded === 'object' && decoded.userId) {
              user = (await User.findById(decoded.userId)) as unknown as Common.User;
            }
          } catch {
            // Token invalid or expired, proceed as unauthenticated
          }
        }

        // Check if query requires authentication (skip for introspection)
        if (!isIntrospection) {
          const query = req.body?.query;
          if (query && requireAuth(query) && !user) {
            throw new GraphQLError('Auth token not found in request', {
              extensions: { code: 'UNAUTHENTICATED' },
            });
          }
        }

        return {
          req,
          res,
          user,
          pubsub: noOpPubSub,
        };
      },
    })
  );

  // 4. Start Server
  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

startServer();
