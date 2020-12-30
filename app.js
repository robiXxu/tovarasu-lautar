const { Client } = require("discord.js");
const client = new Client();
const ytdl = require("ytdl-core");
require("dotenv").config();

client.login(process.env.TOVARASULAUTAR_TOKEN);

const state = {};

const getServer = (message) => state[message.guild.id];

const stop = (message) => {
  const server = getServer(message);
  server.dispatcher = null;
  server.con.disconnect();
  server.con = null;
};

const printQueue = (message) => {
  const queue = getServer(message).queue;

  message.channel.send(
    queue.length ? queue.join("\n") : ":robot: Queue is empty!"
  );
};

const resume = (message) => {
  const server = getServer(message);
  if (server.dispatcher) getServer(message).dispatcher.resume();
};
const repeat = (message) => {
  const server = getServer(message);
  server.repeat = !server.repeat;
};

const pause = (message) => {
  const server = getServer(message);
  if (server.dispatcher) server.dispatcher.pause();
};

const skip = (message) => {
  const server = getServer(message);
  if (server.dispatcher) server.dispatcher.end();
};

const setVolume = (message, args) => {
  const server = getServer(message);
  if (!server.dispatcher) {
    message.channel.send(
      ":robot: Unable to set volume.\nPlease play something before trying to change the volume"
    );
    return;
  }
  const volume = parseFloat(args[0]);
  if (isNaN(volume)) {
    message.channel.send(
      `:robot: Unable to set volume.\nPlease provide a number as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}volume 0.5`
    );
    return;
  }
  if (server.dispatcher) server.dispatcher.setVolume(volume);
};

const setPLP = (message, args) => {
  const server = getServer(message);
  const plpValue = parseFloat(args[0]);
  if (isNaN(plpValue)) {
    message.channel.send(
      `:robot: Unable to set expected package loss percentage.\nPlease provide a number between 0 and 1 as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}plp 0`
    );
    return;
  }
  if (server.dispatcher) server.dispatcher.setPLP(plpValue);
};

const setFEC = (message, args) => {
  const server = getServer(message);
  if (!["true", "false"].includes(args[0])) {
    message.channel.send(
      `:robot: Unable to set forward error correction.\nPlease provide a true/false value as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}plp 0`
    );
    return;
  }
  if (server.dispatcher) server.dispatcher.setFEC(args[0] === "true");
};

const play = (con, message) => {
  const server = state[message.guild.id];
  server.con = con;
  server.dispatcher = con.play(ytdl(server.queue[0], { filter: "audioonly" }));

  server.dispatcher.on("finish", () => {
    if (!server.repeat) server.queue.shift();
    if (server.queue[0]) {
      play(con, message);
    } else {
      stop(message);
    }
  });
};

const handlePlay = (message, args) => {
  if (!args.length) {
    message.channel.send(":robot: Please provide a link!");
    return;
  }
  const member = message.guild.members.cache.get(message.member.user.id);
  if (!member.voice.channel) {
    message.channel.send(":robot: You need to join a voice channel first!");
    return;
  }

  const server = state[message.guild.id];
  server.queue.push(args.join());

  if (!server.dispatcher && !message.guild.voiceConnection)
    member.voice.channel.join().then((con) => play(con, message));
};

const initState = (message) => {
  const serverId = message.guild.id;
  state[serverId] = state[serverId] || {
    queue: [],
    repeat: false,
    dispatcher: null,
    con: null,
  };
};

const printHelp = (message) => {
  const prefix = process.env.TOVARASULAUTAR_PREFIX;
  const commands = [
    `${prefix}play https://youtu.be/EosMazKaPbU`,
    `${prefix}skip`,
    `${prefix}pause`,
    `${prefix}resume`,
    `${prefix}repeat`,
    `${prefix}stop`,
    `${prefix}volume 0.5`,
    `${prefix}queue`,
    `${prefix}clear`,
    `${prefix}plp 0 - expected package lost percentage`,
    `${prefix}fec true - forward error correction`,
  ];
  message.channel.send("```" + commands.join("\n") + "```");
};

const clearQueue = (message) => {
  if (state[message.guild.id]) {
    delete state[message.guild.id].queue;
    state[message.guild.id].queue = [];
  }
};

const messageHandler = (message) => {
  initState(message);
  if (!message.content.startsWith(process.env.TOVARASULAUTAR_PREFIX)) return;
  const [command, ...args] = message.content
    .replace(process.env.TOVARASULAUTAR_PREFIX, "")
    .trim()
    .split(" ");
  switch (command) {
    case "play":
      handlePlay(message, args);
      break;
    case "skip":
      skip(message);
      break;
    case "pause":
      pause(message);
      break;
    case "resume":
      resume(message);
      break;
    case "repeat":
      repeat(message);
      break;
    case "stop":
      stop(message);
      break;
    case "volume":
      setVolume(message, args);
      break;
    case "clear":
      clearQueue(message);
      break;
    case "queue":
      printQueue(message);
      break;
    case "plp":
      setPLP(message, args);
      break;
    case "fec":
      setFEC(message, args);
      break;
    case "help":
      printHelp(message);
      break;
  }
};

client.on("message", messageHandler);
client.on("ready", () => {
  console.log("Tovarășu' Lăutar is online!");
});
