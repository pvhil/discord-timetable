const WebUntis = require('webuntis');

const pg = require('pg').Client;

const discordToken = "#"
const pgcred = "###"


const pgclient = new pg(pgcred);

pgclient.connect();

const {
  Client,
  Intents,
  MessageEmbed,
  MessageActionRow,
  MessageButton
} = require('discord.js');
const client = new Client({
  intents: [Intents.FLAGS.GUILDS]
});

client.on('interactionCreate', async interaction => {
  //buttons
  if (interaction.isButton()) {
    if (interaction.customId.toString().includes("dayplus")) {
      interaction.deferUpdate();
      var tempdate = new Date(interaction.customId.split('-')[1])
      var kid = interaction.customId.substr(0, interaction.customId.indexOf('+'));
      tempdate.setDate(tempdate.getDate() + 1);
      getStundenplan(interaction, tempdate, kid);

    } else if (interaction.customId.toString().includes("dayminus")) {
      interaction.deferUpdate();

      var tempdate = new Date(interaction.customId.split('-')[1])
      tempdate.setDate(tempdate.getDate() - 1);
      var kid = interaction.customId.substr(0, interaction.customId.indexOf('+'));
      getStundenplan(interaction, tempdate, kid);
    }

    return
  }

  //slash commands
  if (interaction.commandName === 'stundenplan' && interaction.isCommand()) {
    interaction.deferReply();
    var curdate = new Date()
    var prefUser = interaction.options.getUser("nutzer")
    if (prefUser == null) {
      prefUser = interaction.user.id
    }

    getStundenplan(interaction, curdate, prefUser);
  }
  if (interaction.commandName === 'einstellen' && interaction.isCommand()) {
    interaction.deferReply();   
    const schoolname = interaction.options.getString('schulname');
    const uname = interaction.options.getString('untis-nutzername');
    const userver = interaction.options.getString('untis-server');

    let data = interaction.options.getString('untis-passwort');
    let buff = new Buffer.from(data);
    let basepw = buff.toString('base64');

    const uid = interaction.user.id;
    const sid = interaction.guild.id;

    const cid = uid + sid;

    pgclient.query("INSERT INTO untisuser(custom, did, sid, untisname, untispw, untisschool, untisserver, allowother) VALUES ('" + cid + "','" + uid + "','" + sid + "','" + uname + "','" + basepw + "','" + schoolname + "','" + userver + "',true) ON CONFLICT ON CONSTRAINT untisuser_pkey DO NOTHING;", (err, res) => {
      console.log(err ? err.stack : res.rows[0]) // Hello World!
    })

    var responseEinstellen = new MessageEmbed()
      .setColor('#1aff00')
      .setTitle("Dein Untis-Nuterdaten wurden gespeichert!")
      .setDescription("Mit **/stundenplan** kannst du ganz einfach deinen Stundenplan bei der " + schoolname + " betrachten!")
      .setTimestamp()
      .setFooter('von phil');

    await interaction.editReply({
      embeds: [responseEinstellen],
      ephemeral: true
    });
  }

  if (interaction.commandName === 'hilfe' && interaction.isCommand()) {
    interaction.deferReply();
        var responseHilfe = new MessageEmbed()
      .setColor('#ff6033')
      .setTitle("Der Unoffizielle Discord-Untis-Bot")
      .setDescription("**Was kann der Bot?**\n▫️ **/stundenplan** zeigt deinen Stundenplan an.\n▫️ **/einstellen** lässt dich mit deinen Untis-Daten anmelden. (Anmeldedaten werden verschlüsselt gespeichert)\n▫️ **/hilfe** zeigt dieses Fenster.\n\nDu brauchst Support?\nJoine meinen [Discord](https://discord.gg/DUuCMgXDJC)")
      .setTimestamp()
      .setFooter('von phil#0346');

    await interaction.editReply({
      embeds: [responseHilfe]
    });
  }

});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("/hilfe");
});

async function getStundenplan(interaction, curdate, hourid) {

  try {

    var table = []
    cuId = hourid + interaction.guild.id
    var school = ""
    var name = ""
    var pw = ""
    var server = ""

    pgclient.query("SELECT * FROM untisuser WHERE custom='" + cuId + "'", (err, res) => {

      try {
        school = res.rows[0].untisschool
        name = res.rows[0].untisname
        let data = res.rows[0].untispw
        let buff = new Buffer.from(data, 'base64');
        pw = buff.toString('ascii');
        if (res.rows[0].untisserver == "null") {
          server = "tipo.webuntis.com"
        } else {
          server = res.rows[0].untisserver
        }
      } catch (err) {
        var errEmbed = new MessageEmbed()
          .setColor('#ff0000')
          .setTitle("Ein Fehler ist aufgetreten!")
          .setDescription("Deine Anmeldedaten für Untis sind ungültig!\nBitte ändere sie mit **/einstellen** um auf deinen Stundenplan zuzugreifen!")
          .setTimestamp()
          .setFooter('von phil');

        if (isbuttonclick) {
          interaction.update({
            embeds: [errEmbed]
          })
        } else {
          interaction.reply({
            embeds: [errEmbed]
          })
        }
        return
      }
      //get stundenplan
      var untis = new WebUntis(school, name, pw, server);
      untis
        .login()
        .then(() => {
          return untis.getOwnTimetableFor(curdate);
        })
        .then((timetable) => {
          timetable.sort((a, b) => {
            return a.startTime - b.startTime
          })

          for (var i = 0; i < timetable.length; i++) {
            var emote = "🟩"
            var textextra = ""
            if (timetable[i].code == "cancelled") {
              emote = "🟥"
              textextra = "~~"

            }
            var start = "null";
            if (timetable[i].startTime.toString().length == 3) {
              start = timetable[i].startTime.toString().charAt(0) + ":" + timetable[i].startTime.toString().charAt(1) + timetable[i].startTime.toString().charAt(2)
            } else if (timetable[i].startTime.toString().length == 4) {
              start = timetable[i].startTime.toString().charAt(0) + timetable[i].startTime.toString().charAt(1) + ":" + timetable[i].startTime.toString().charAt(2) + timetable[i].startTime.toString().charAt(3)
            }
            var end = "null";
            if (timetable[i].endTime.toString().length == 3) {
              end = timetable[i].endTime.toString().charAt(0) + ":" + timetable[i].endTime.toString().charAt(1) + timetable[i].endTime.toString().charAt(2)
            } else if (timetable[i].endTime.toString().length == 4) {
              end = timetable[i].endTime.toString().charAt(0) + timetable[i].endTime.toString().charAt(1) + ":" + timetable[i].endTime.toString().charAt(2) + timetable[i].endTime.toString().charAt(3)
            }



            table.push(emote + textextra + " **" + start + " - " + end + "**: " + timetable[i].sg + " in " + timetable[i].ro[0].name + textextra + "\n")
          }

          var uname = interaction.user.username

          var tempstring = table.join('')
          var options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          };
          var stundenplanEmbed = new MessageEmbed()
            .setColor('#ff6033')
            .setTitle("Stundenplan für " + uname + " am " + curdate.toLocaleDateString('de-DE', options))
            .setDescription(tempstring)
            .setTimestamp()
            .setFooter('von phil');

          untis.getNewsWidget(curdate).then(messages => {
              tempmes = []
              for (var i = 0; i < messages.messagesOfDay.length; i++) {
                tempmes.push(messages.messagesOfDay[i].text.toString().replace(/<\/?[^>]+(>|$)/g, "") + "\n")
              }

              mesString = tempmes.join("").toString().replaceAll("\n", "\n\n")
              if (Array.isArray(tempmes) && tempmes.length) {
                stundenplanEmbed.addField(name = "**Nachrichten:**", value = mesString, inline = false);
              }

              var buttonDate = (curdate.getMonth() + 1) + "." + curdate.getDate() + "." + curdate.getFullYear()

              const row = new MessageActionRow()
                .addComponents(
                  new MessageButton()
                  .setCustomId(hourid + '+dayminus-' + buttonDate)
                  .setEmoji('⬅️')
                  .setStyle('PRIMARY'),
                  new MessageButton()
                  .setCustomId(hourid + '+dayplus-' + buttonDate)
                  .setEmoji('➡️')
                  .setStyle('PRIMARY'),
                );

                interaction.editReply({
                  embeds: [stundenplanEmbed],
                  components: [row]
                })
              untis.logout();

            }

          )
        })
    })
  } catch (err) {
    console.trace()
    var errEmbed = new MessageEmbed()
      .setColor('#ff0000')
      .setTitle("Ein Fehler ist aufgetreten!")
      .setDescription("Deine Anmeldedaten für Untis sind ungültig!\nBitte ändere sie mit **/einstellen** um auf deinen Stundenplan zuzugreifen!")
      .setTimestamp()
      .setFooter('von phil');

      interaction.editReply({
        embeds: [errEmbed]
      })
  }

}


client.login(discordToken);