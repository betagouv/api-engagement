import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import passport from '../src/services/passport';
import MyOrganizationV0Controller from '../src/v0/myorganization';
import MyMissionV0Controller from '../src/v0/mymission';

// Create a test Express app with minimal configuration
export const createTestApp = () => {
  const app = express();
  
  // Configure middleware
  app.use(cors({ credentials: true, origin: '*' }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(passport.initialize());
  
  // Mount the controllers
  app.use('/v0/myorganization', MyOrganizationV0Controller);
  app.use('/v0/mymission', MyMissionV0Controller);
  
  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, _: express.NextFunction) => {
    console.error(err);
    res.status(500).send({ ok: false, code: 'SERVER_ERROR' });
  });
  
  return app;
};
