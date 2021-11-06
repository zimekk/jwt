import path from "path";
import express, { Router } from "express";

// https://dev.to/mr_cea/remaining-stateless-a-more-optimal-approach-e7l
// userSchema.pre<IUser>("save", function(next) {
//   if (!this.isModified("password")) { return next(); }
//   const hash = bcrypt.hashSync(this.password, 10);
//   this.password = hash;
//   return next();
// });

// // method for compare the password
// userSchema.methods.comparePassword = function(password: string) {
//   const user = bcrypt.compareSync(password, this.password);
//   return user ? this : null;
// };

// export const generateRefreshCookie = (args: any, response: Context) => {
//   const refreshToken = encode(args, refreshSecret, { expiresIn: "30d" });
//   const auth = response.cookie("refreshtoken", refreshToken, {
//       expiresIn: "30d",
//       httpOnly: true,
//       secure: false,
//   });
//   return auth;
// };

// if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
//   throw 'Username or password is incorrect';
// }

// function randomTokenString() {
//   return crypto.randomBytes(40).toString('hex');
// }

// https://github.com/Sid-Shanker/jwt-auth-nodejs
// https://github.com/bezkoder/jwt-refresh-token-node-js/blob/master/app/routes/auth.routes.js
const authMiddleware = {
  verifyToken: (_req, _res, next) => next(),
};

const authController = {
  signin: (_req, res) =>
    res.json({
      token: 123,
    }),
  signup: (_req, res) => res.json(require("@dev/web/src/assets/api/auth.json")),
  refreshToken: (_req, res) => res.json({ token: 456 }),
  logout: (_req, res) => res.json({ token: null }),
  verify: (_req, res) => res.json({ ok: true }),
};

const authRoutes = Router()
  .get("/signin", authController.signin)
  .get("/verify", authController.verify)
  .get("/refresh-token", authController.refreshToken)
  .get("/logout", authController.logout);

const userController = {
  user: (_req, res) => res.json(require("@dev/web/src/assets/api/user.json")),
};

const userRoutes = Router().get(
  "/",
  [authMiddleware.verifyToken],
  userController.user
);

export const router = Router()
  .use("/api/auth", authRoutes)
  .use("/api/user", userRoutes);

class Server {
  options: Object;

  constructor(options = {}) {
    this.options = options;

    if (typeof options.setupExitSignals === "undefined") {
      options.setupExitSignals = true;
    }
  }

  async initialize() {
    this.setupApp();
    this.setupFeatures();
    this.createServer();

    if (this.options.setupExitSignals) {
      const signals = ["SIGINT", "SIGTERM"];
      const exitProcess = () => process.exit();
      signals.forEach((signal) => {
        process.on(signal, () => this.stopCallback(exitProcess));
      });
    }
  }

  setupApp() {
    this.app = new express();
  }

  setupStaticFeature() {
    this.options.static.forEach((staticOption) => {
      staticOption.publicPath.forEach((publicPath) => {
        this.app.use(
          publicPath,
          express.static(staticOption.directory, staticOption.staticOptions)
        );
      });
    });
  }

  setupOnBeforeSetupMiddlewareFeature() {
    this.options.onBeforeSetupMiddleware(this);
  }

  setupFeatures() {
    const features = {
      static: () => {
        this.setupStaticFeature();
      },
      onBeforeSetupMiddleware: () => {
        if (typeof this.options.onBeforeSetupMiddleware === "function") {
          this.setupOnBeforeSetupMiddlewareFeature();
        }
      },
    };

    const runnableFeatures = [];

    if (this.options.onBeforeSetupMiddleware) {
      runnableFeatures.push("onBeforeSetupMiddleware");
    }

    if (this.options.static) {
      runnableFeatures.push("static");
    }

    runnableFeatures.forEach((feature) => {
      features[feature]();
    });
  }

  createServer() {
    this.server = require("http").createServer(this.app);
    this.server.on("error", (error) => {
      throw error;
    });
  }

  async start() {
    this.logger = console;

    await this.initialize();

    const listenOptions = { host: this.options.host, port: this.options.port };

    await new Promise((resolve) => {
      this.server.listen(listenOptions, () => {
        resolve();
      });
    });

    if (typeof this.options.onListening === "function") {
      this.options.onListening(this);
    }
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => {
          this.server = null;

          resolve();
        });

        for (const socket of this.sockets) {
          socket.destroy();
        }

        this.sockets = [];
      });

      if (this.middleware) {
        await new Promise((resolve, reject) => {
          this.middleware.close((error) => {
            if (error) {
              reject(error);

              return;
            }

            resolve();
          });
        });

        this.middleware = null;
      }
    }
  }

  stopCallback(callback) {
    this.stop().then(() => callback(null), callback);
  }
}

// https://stackoverflow.com/questions/6398196/detect-if-called-through-require-or-directly-by-command-line
if (process.mainModule.filename === __filename) {
  const defaultOptionsForStatic = {
    directory: path.join(process.cwd(), "public"),
    staticOptions: {},
    publicPath: ["/"],
    serveIndex: { icons: true },
  };

  const middleware = router;

  const server = new Server({
    port: 8080,
    static: [defaultOptionsForStatic],
    onBeforeSetupMiddleware: async function (devServer) {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined");
      }
      devServer.app.use(require("morgan")("combined")).use(middleware);
    },
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined");
      }

      const port = devServer.server.address().port;
      console.log(`Listening on port: ${port}`);
    },
  });

  server.start();
}
