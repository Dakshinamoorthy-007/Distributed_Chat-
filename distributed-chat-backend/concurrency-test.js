const WebSocket = require("ws");

const conversationId = "177f7350-ce1d-45da-a8ec-a8a6b94ae245";
const users = ["alice", "bob", "charlie"];

const sockets = {};
const received = [];

function connect(user) {
    return new Promise((resolve, reject) => {
        const url =
            `ws://localhost/ws/chat?userId=${user}&conversationId=${conversationId}`;

        console.log(`[CONNECTING] ${user}`);

        const ws = new WebSocket(url);

        let connected = false;

        ws.on("open", () => {
            console.log(`[OPEN] ${user}`);
        });

        ws.on("message", data => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.type === "CONNECTED") {
                    connected = true;
                    sockets[user] = ws;

                    console.log(
                        `[CONNECTED] ${user} -> ${msg.serverId}`
                    );

                    resolve();
                    return;
                }

                if (msg.type === "MESSAGE") {
                    const message = msg.message;

                    received.push({
                        receiver: user,
                        sender: message.senderId,
                        content: message.content,
                        id: message.id
                    });

                    console.log(
                        `[RECEIVED] ${user} <- ${message.senderId}: ${message.content}`
                    );
                    return;
                }

                if (msg.type === "ERROR") {
                    console.error(
                        `[SERVER ERROR] ${user}: ${msg.error}`
                    );
                }

            } catch (e) {
                console.error(
                    `[INVALID RESPONSE] ${user}:`,
                    data.toString()
                );
            }
        });

        ws.on("close", (code, reason) => {
            console.log(
                `[CLOSED] ${user} code=${code} reason=${reason.toString()}`
            );

            if (!connected) {
                reject(
                    new Error(
                        `${user} failed to establish WebSocket connection`
                    )
                );
            }
        });

        ws.on("error", err => {
            console.error(`[SOCKET ERROR] ${user}: ${err.message}`);

            if (!connected) {
                reject(err);
            }
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function send(user, content) {
    const ws = sockets[user];

    if (!ws) {
        throw new Error(`No active WebSocket for ${user}`);
    }

    if (ws.readyState !== WebSocket.OPEN) {
        throw new Error(
            `WebSocket for ${user} is not OPEN`
        );
    }

    const payload = JSON.stringify({
        conversationId,
        content
    });

    ws.send(payload);

    console.log(`[SENT] ${user} -> ${content}`);

    await sleep(100);
}

async function main() {
    console.log("\n================================");
    console.log("  CONCURRENCY TEST");
    console.log("================================\n");

    try {
        console.log("Connecting all users...\n");

        await Promise.all(
            users.map(user => connect(user))
        );

        console.log("\nAll 3 users successfully connected.");
        console.log(
            `Active connections: ${Object.keys(sockets).length}`
        );

        await sleep(1000);

        const messages = [
            ["alice", "TEST-A1"],
            ["bob", "TEST-B1"],
            ["charlie", "TEST-C1"],
            ["alice", "TEST-A2"],
            ["bob", "TEST-B2"],
            ["charlie", "TEST-C2"],
            ["alice", "TEST-A3"],
            ["bob", "TEST-B3"],
            ["charlie", "TEST-C3"],
            ["alice", "TEST-A4"]
        ];

        console.log("\nSending 10 messages...\n");

        for (const [user, content] of messages) {
            await send(user, content);
        }

        console.log("\nAll 10 messages sent.");

        console.log("\nWaiting for Redis/WebSocket delivery...");
        await sleep(3000);

        console.log("\n================================");
        console.log("  TEST SUMMARY");
        console.log("================================");

        console.log(`Messages sent: 10`);
        console.log(`Messages received: ${received.length}`);

        const expectedPerUser = 10;

        for (const user of users) {
            const count = received.filter(
                message => message.receiver === user
            ).length;

            console.log(
                `${user}: received ${count}/${expectedPerUser}`
            );
        }

        const uniqueIds = new Set(
            received.map(message => message.id)
        );

        console.log(
            `Unique message IDs received: ${uniqueIds.size}`
        );

        if (received.length === 30) {
            console.log("\nPASS: All 3 users received all 10 messages.");
        } else {
            console.log(
                "\nFAIL: Expected 30 deliveries but received " +
                received.length
            );
        }

    } catch (error) {
        console.error("\nTEST FAILED:");
        console.error(error.message);

    } finally {
        console.log("\nClosing connections...");

        for (const user of users) {
            if (sockets[user]) {
                sockets[user].close();
            }
        }

        await sleep(500);

        console.log("Test finished.\n");
    }
}

main();