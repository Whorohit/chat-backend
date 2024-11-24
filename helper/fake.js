import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../Modals/user.js";
import { Chat } from "../Modals/chat.js";
import { Messages } from "../Modals/message.js";
import { Friend } from "../Modals/friends.js";
import { getothermember } from "../utils/features.js";
import { Archived } from "../Modals/Archived.js";

const createUser = async (numUsers) => {
  try {
    const usersPromise = [];

    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        email: faker.internet.email(),
        password: "1234567890",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      usersPromise.push(tempUser);
    }

    await Promise.all(usersPromise);

    console.log("Users created", numUsers);
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
const createSampleChat = async (Chatcount) => {
  try {
    const users = await Friend.find().select("friends");
    const chatPromise = [];
    let index = 0;
    let c = 0
    while (index < Chatcount) {
      const user1 = users[c].friends[0];
      const user2 = users[c].friends[1];

      // Check if a chat with these members already exists
      const existingChat = await Chat.findOne({ members: { $all: [user1, user2] } });

      if (!existingChat) {
        // Randomly set visible to true or false
        const isVisible = Math.random() >= 0.5;

        // If chat doesn't exist, create a new one
        chatPromise.push(
          Chat.create({
            name: faker.lorem.words(5),
            members: [user1, user2],
            visible: isVisible
          })
        );
        index++;
      }
      c++;

    }

    // Execute all chat creation promises
    await Promise.all(chatPromise);

    console.log("Chat creation process complete.");
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
const createArchived = async (userid, count) => {
  try {
    // Find all chats where the user is a member
    const chat = await Chat.find({
      members: userid
    });

    // Get other members from the chat excluding the current user
    const othermemberlist = chat.map((i) => getothermember(i.members, userid)).flatMap(i => i);

    // Fetch or create the Archived document for the user
    let archivedDoc = await Archived.findOne({ user: userid });

    if (!archivedDoc) {
      // If no archived document exists for the user, create a new one with empty arrays
      archivedDoc = new Archived({ user: userid, archived: [], family: [], friends: [] });
    }

    // Ensure the arrays exist, in case they are undefined
    archivedDoc.archived = archivedDoc.archived || [];
    archivedDoc.family = archivedDoc.family || [];
    archivedDoc.friends = archivedDoc.friends || [];

    // Add members to the archived, family, or friends list randomly
    othermemberlist.forEach(member => {
      // Randomly choose between 'archived', 'family', or 'friends'
      const randomList = getRandomList();

      // Check if the member is already in the selected list, if not, add them
      if (!archivedDoc[randomList].includes(member)) {
        archivedDoc[randomList].push(member);
      }
    });

    // Save the updated archived document
    await archivedDoc.save();

    console.log(`Archived document updated for user: ${userid}`);
  } catch (error) {
    console.error("Error creating archived list:", error);
  }
};

// Helper function to randomly choose a list ('archived', 'family', or 'friends')
function getRandomList() {
  const lists = ['archived', 'family', 'friends'];
  return lists[Math.floor(Math.random() * lists.length)];
}

const createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");

    const chatsPromise = [];

    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });
      const members = [];

      for (let i = 0; i < numMembers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        // Ensure the same user is not added twice
        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = Chat.create({
        groupchats: true,
        name: faker.lorem.words(1),
        members,
        creator: members[0],
      });

      chatsPromise.push(chat);
    }

    await Promise.all(chatsPromise);

    console.log("Chats created successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
const createmessages = async (nummessages) => {
  try {
    const chats = await Chat.find().populate("members").select("_id members");

    const messagePromises = [];

    for (let i = 0; i < nummessages; i++) {
      const randomChat = chats[Math.floor(Math.random() * chats.length)];

      // Select a random member from the chat's members
      const randomMember = randomChat.members[Math.floor(Math.random() * randomChat.members.length)];

      messagePromises.push(
        Messages.create({
          chat: randomChat._id,
          sender: randomMember,
          content: faker.lorem.sentence({ min: 5, max: 25 })
        })
      );
    }

    await Promise.all(messagePromises);
    console.log(`${nummessages} messages created successfully.`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating messages:", error);
    process.exit(1);
  }
};

const createMessagesInAChat = async (chatId, numMessages) => {
  try {
    const users = await User.find().select("_id");

    const messagesPromise = [];

    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      messagesPromise.push(
        Messages.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagesPromise);

    console.log("Messages created successfully");
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
// const createfrinds = async (userid, friend) => {
//   const users = await User.find({ _id: { $ne: userid } }).select("_id");
//   if (users.length === 0) {
//     throw new Error("No users available to create friends.");
//   }


//   for (let i = 0; i < friend; i++) {
//     const randomIndex = Math.floor(Math.random() * users.length);
//     const randomuser = users[randomIndex]._id;
//     const makefriend = [userid, randomuser];
//     friend = await Friend.find({
//       friends: makefriend
//     })
//     if (!friend) {
//       await Friend.create({
//         friends: makefriend
//       })
//     }
//   }
// }


export const createFakeFriends = async (userid, friendCount) => {
  try {
    // Get all user IDs except the provided userid
    const users = await User.find({ _id: { $ne: userid } }).select("_id");
    if (users.length === 0) {
      throw new Error("No users available to create friends.");
    }

    const promises = [];

    for (let i = 0; i < friendCount; i++) {
      const randomIndex = Math.floor(Math.random() * users.length);
      const randomuser = users[randomIndex]._id;
      const makefriend = [userid, randomuser];

      const friendPromise = Friend.findOne({ friends: { $all: makefriend } }).then(friend => {
        if (!friend) {
          return Friend.create({ friends: makefriend });
        }
      });

      promises.push(friendPromise);
    }

    await Promise.all(promises);
    console.log(`Created ${friendCount} fake friends for user ${userid}.`);
    process.exit(1);

  } catch (error) {
    console.error("Error creating fake friends:", error);
    process.exit(1);
  }
};






export { createUser, createSampleChat, createGroupChats, createmessages, createMessagesInAChat, createArchived };