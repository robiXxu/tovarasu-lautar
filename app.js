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
  return null;
};

const printQueue = (message) => {
  const queue = getServer(message).queue;

  return message.channel.send(
    queue.length ? queue.join("\n") : ":robot: Queue is empty!"
  );
};

const resume = (message) => {
  const server = getServer(message);
  return server.dispatcher ? getServer(message).dispatcher.resume() : null;
};
const repeat = (message) => {
  const server = getServer(message);
  server.repeat = !server.repeat;
  return null;
};

const pause = (message) => {
  const server = getServer(message);
  return server.dispatcher ? server.dispatcher.pause() : null;
};

const skip = (message) => {
  const server = getServer(message);
  return server.dispatcher ? server.dispatcher.end() : null;
};

const setVolume = (message, args) => {
  const server = getServer(message);
  if (!server.dispatcher) {
    message.channel.send(
      ":robot: Unable to set volume.\nPlease play something before trying to change the volume"
    );
    return null;
  }
  const volume = parseFloat(args[0]);
  if (isNaN(volume)) {
    message.channel.send(
      `:robot: Unable to set volume.\nPlease provide a number as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}volume 0.5`
    );
    return null;
  }
  return server.dispatcher ? server.dispatcher.setVolume(volume) : null;
};

const setPLP = (message, args) => {
  const server = getServer(message);
  const plpValue = parseFloat(args[0]);
  if (isNaN(plpValue)) {
    message.channel.send(
      `:robot: Unable to set expected package loss percentage.\nPlease provide a number between 0 and 1 as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}plp 0`
    );
    return null;
  }
  return server.dispatcher ? server.dispatcher.setPLP(plpValue) : null;
};

const setFEC = (message, args) => {
  const server = getServer(message);
  if (!["true", "false"].includes(args[0])) {
    message.channel.send(
      `:robot: Unable to set forward error correction.\nPlease provide a true/false value as a second argument: ${process.env.TOVARASULAUTAR_PREFIX}plp 0`
    );
    return null;
  }
  return server.dispatcher
    ? server.dispatcher.setFEC(args[0] === "true")
    : null;
};

const play = (con, message) => {
  const server = state[message.guild.id];
  server.con = con;
  server.dispatcher = con.play(ytdl(server.queue[0], { filter: "audioonly" }));

  server.dispatcher.on("finish", () => {
    if (!server.repeat) server.queue.shift();
    if (server.queue[0]) {
      return play(con, message);
    } else {
      return stop(message);
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
    return null;
  }

  const server = state[message.guild.id];
  server.queue.push(args.join());

  if (!server.dispatcher && !message.guild.voiceConnection)
    return member.voice.channel.join().then((con) => play(con, message));
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

const messageHandler = (message) => {
  initState(message);
  if (!message.content.startsWith(process.env.TOVARASULAUTAR_PREFIX)) return;
  const [command, ...args] = message.content
    .replace(process.env.TOVARASULAUTAR_PREFIX, "")
    .trim()
    .split(" ");
  switch (command) {
    case "play":
      return handlePlay(message, args);
    case "skip":
      return skip(message);
    case "pause":
      return pause(message);
    case "resume":
      return resume(message);
    case "repeat":
      return repeat(message);
    case "stop":
      return stop(message);
    case "volume":
      return setVolume(message, args);
    case "queue":
      return printQueue(message);
    case "plp":
      return setPLP(message, args);
    case "fec":
      return setFEC(message, args);
  }
};

client.on("message", messageHandler);
client.on("ready", () => {
  console.log("Tovarășu' Lăutar is online!");
});
