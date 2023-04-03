const isWindows = false;

const commandName = "docker";
const command = `${isWindows ? "where" : "which"} ${commandName}`;
console.log(command);
