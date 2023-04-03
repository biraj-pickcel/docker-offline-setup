const { exec } = require("child_process");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { createInterface } = require("readline");

const REQUIRED_FILES = ["application.json", "digital-signage.tar", "docker-compose.yml", ".env"];
const isWindows = process.platform === "win32";

(async function main() {
  // checking if docker is installed or not
  if (!(await commandExists("docker"))) {
    console.error("error: docker must be installed");
    process.exit(1);
  }

  // checking if required files are this in working dir or not
  REQUIRED_FILES.forEach((file) => {
    const filePath = path.join((process.cwd(), file));
    if (!fs.existsSync(filePath)) {
      console.error(`error: '${file}' not found  working directory`);
      process.exit(1);
    }
  });

  // asking user to enter their local ip address
  const rl = createInterface(process.stdin, process.stdout);
  rl.question("enter ip address: ", async (answer) => {
    rl.close();
    answer = answer.trim();

    // validating given ip address
    const isValidIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(answer);
    if (!isValidIP) {
      console.log("error: please enter a correct ip address");
      process.exit(1);
    }

    // reading & parsing .env file
    const envFilePath = path.join(process.cwd(), ".env");
    const envFile = fs.readFileSync(envFilePath);
    const env = dotenv.parse(envFile);

    // setting required variables to given ip
    env["SERVER_NAME"] = answer;
    env["PICKCEL_SERVER_HOST"] = `'http://${answer}'`;

    // saving changes to .env
    toEnv(env);
    console.log("ip address modified\n");

    try {
      // stopping the running containers
      await execute("docker compose down");

      // loading images from tarball
      console.log(await execute("docker load -i digital-signage.tar"));

      // starting containers
      await execute("docker compose up -d");
      console.log("docker containers started");
    } catch (err) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }

    console.log("done");
  });
})();

async function commandExists(commandName) {
  return new Promise((resolve, reject) => {
    const command = `${isWindows ? "where" : "which"} ${commandName}`;
    exec(command, (err, stdout, stderr) => {
      if (err || stderr) {
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}

async function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stdout);
    });
  });
}

function toEnv(env) {
  try {
    let newEnv = [];
    for (const key in env) {
      newEnv.push(`${key}=${env[key]}`);
    }

    fs.writeFileSync(".env", newEnv.join("\n"));
  } catch (err) {
    console.error(`error: ${err.message}`);
  }
}
