const randomstring = require("randomstring");

module.exports = async(client, msg, suffix) => {
	let time = Date.now();

	let cooldown = await r.table("Cooldowns").get(`${msg.author.id}-message`);
	if (cooldown && cooldown.time > time) return msg.channel.send({ embed: { color: config.colors.error, title: "Cooldown", description: `Not so quick... you're under cooldown for another ${Math.round((cooldown.time - time) / 1000, 1)}s`, footer: { text: "Keep in mind that spamming a mailbox will result in a strike/blacklist." } } });
	else client.cooldown(msg.author.id, "message");

	if (!suffix) return msg.reply("How do you send nothing to no one? Syntax: `>mesasge [number] [message]`");

	let toNumber, message;
	toNumber = client.replaceNumber(suffix.split(" ")[0]);
	message = suffix.split(" ");
	message.shift();
	message = message.join(" ");

	if (!message) return msg.reply("<:Monocle:366036726449438731> I can't seem to find a message to send.");
	if (message.length > 400) return msg.reply(":page_with_curl: don't you think this is a bit too much to read?");

	let fromNumberDoc = await r.table("Numbers")
		.getAll(msg.channel.id, { index: "channel" })
		.nth(0)
		.default(null);
	if (!fromNumberDoc) return msg.reply("This channel doesn't have a number.");
	if (new Date(fromNumberDoc.expiry).getTime() < Date.now()) return msg.reply("This channel's number has expired. Please call `*233` to renew it.");

	toNumber = client.replaceNumber(toNumber);
	let toNumberDoc = await r.table("Numbers").get(toNumber);
	if (!toNumberDoc) return msg.reply("That number couldn't be found.");

	if (fromNumberDoc.id == toNumberDoc.id) return msg.reply("You can't send a message to yourself.");

	let account = await r.table("Accounts").get(msg.author.id);
	if (!account) {
		account = { id: msg.author.id, balance: 0 };
		await r.table("Accounts").insert(account);
		await msg.reply(`You don't have an account created...Creating an account for you! Please also read for information on payment: <${config.paymentLink}>`);
	}

	if (account.balance < config.messageCost) return msg.reply(`You don't have enough credits (${config.messageCost}) to send a message.`);
	account.balance -= config.messageCost;

	let mailbox = await r.table("Mailbox").get(toNumberDoc.channel);
	if (!mailbox) return msg.reply("This number doesn't have a mailbox.");

	await r.table("Accounts").get(msg.author.id).update({ balance: account.balance });
	let id = randomstring.generate({ length: 5, charset: "alphanumeric", readable: true });
	while (mailbox.messages.find(x => x.id == id)) {
		id = randomstring.generate({ length: 5, charset: "alphanumeric", readable: true });
	}

	let messageDoc = {
		id: id,
		number: fromNumberDoc.id,
		user: msg.author.id,
		message: message,
		time: time,
	};

	let messages = mailbox.messages || [];
	messages.push(messageDoc);

	await r.table("Mailbox").get(toNumberDoc.channel).update({ messages: messages });
	client.apiSend(`You received a message. Check it using \`>mailbox\``, mailbox.id);
	msg.reply("Your message arrived safely.");
};
