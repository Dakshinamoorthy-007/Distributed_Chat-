const WebSocket = require("ws");

const SERVER_URL = "ws://localhost/ws/chat";
const CONVERSATION_ID ="32737cf8-40de-43ed-9dbb-7670108a0496";

const USER_COUNT = 50;
const MESSAGES_PER_USER = 10;

const sockets = [];

let connected = 0;
let sent = 0;
let received = 0;
let errors = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function connectUser(index) {

    return new Promise((resolve) => {

        const userId = `loaduser${index}`;

        const ws = new WebSocket(
            `${SERVER_URL}?userId=${userId}&conversationId=${CONVERSATION_ID}`
        );

        sockets.push({
            userId,
            ws
        });

        ws.on("open", () => {

            connected++;

            console.log(
                `${userId} connected (${connected}/${USER_COUNT})`
            );

            resolve();
        });

        ws.on("message", (data) => {

            try {

                const message = JSON.parse(data.toString());

                if (message.type === "MESSAGE") {
                    received++;
                }

            } catch {
                // Ignore non-JSON messages
            }
        });

        ws.on("error", (error) => {

            errors++;

            console.log(
                `${userId} ERROR: ${error.message}`
            );
        });

        ws.on("close", () => {
            // Connection closed
        });
    });
}


async function runTest() {

    console.log("\n================================");
    console.log(" WebSocket Load Test");
    console.log("================================");
    console.log(`Users: ${USER_COUNT}`);
    console.log(`Messages/user: ${MESSAGES_PER_USER}`);
    console.log(`Total messages: ${USER_COUNT * MESSAGES_PER_USER}`);
    console.log("================================\n");

    console.log("Connecting users...\n");

    await Promise.all(
        Array.from(
            { length: USER_COUNT },
            (_, index) => connectUser(index + 1)
        )
    );

    console.log("\n================================");
    console.log(`Connections opened: ${connected}/${USER_COUNT}`);
    console.log("================================\n");

    if (connected !== USER_COUNT) {

        console.log("FAIL: Not all users connected.");
        closeConnections();
        return;
    }

    console.log("Waiting for connection setup...");
    await sleep(2000);

    // Verify socket states
    console.log("\nChecking socket states...\n");

    let openSockets = 0;

    for (const client of sockets) {

        const state = client.ws.readyState;

        if (state === WebSocket.OPEN) {
            openSockets++;
        } else {
            console.log(
                `${client.userId} is NOT OPEN. State: ${state}`
            );
        }
    }

    console.log(
        `Open sockets: ${openSockets}/${USER_COUNT}`
    );

    if (openSockets !== USER_COUNT) {

        console.log(
            "\nFAIL: Not all sockets are still OPEN."
        );

        closeConnections();
        return;
    }

    console.log("\nStarting message load...\n");

    for (let round = 1; round <= MESSAGES_PER_USER; round++) {

        for (let i = 0; i < sockets.length; i++) {

            const client = sockets[i];
            const ws = client.ws;

            if (ws.readyState !== WebSocket.OPEN) {

                console.log(
                    `${client.userId} skipped - state=${ws.readyState}`
                );

                continue;
            }

            const message = {
                conversationId: CONVERSATION_ID,
                content: `LOAD-${i + 1}-${round}`
            };

            ws.send(JSON.stringify(message));

            sent++;
        }

        console.log(
            `Round ${round}/${MESSAGES_PER_USER} completed`
        );

        await sleep(200);
    }

    console.log(`\nMessages sent: ${sent}`);

    console.log("Waiting for message delivery...\n");

    await sleep(5000);

    const expectedDeliveries = sent * USER_COUNT;

    console.log("================================");
    console.log(" TEST RESULT");
    console.log("================================");

    console.log(`Connections opened: ${connected}/${USER_COUNT}`);
    console.log(`Open sockets:       ${openSockets}/${USER_COUNT}`);
    console.log(`Messages sent:      ${sent}`);
    console.log(`Messages received:  ${received}`);
    console.log(`Expected delivery:  ${expectedDeliveries}`);
    console.log(`Errors:             ${errors}`);

    console.log("================================");

    if (
        connected === USER_COUNT &&
        openSockets === USER_COUNT &&
        sent === USER_COUNT * MESSAGES_PER_USER &&
        received === expectedDeliveries &&
        errors === 0
    ) {
        console.log("\nPASS: 25-user load test successful.");
    } else {
        console.log("\nFAIL: Load test detected an issue.");
    }

    closeConnections();
}


function closeConnections() {

    console.log("\nClosing connections...");

    for (const client of sockets) {

        if (
            client.ws.readyState === WebSocket.OPEN ||
            client.ws.readyState === WebSocket.CONNECTING
        ) {
            client.ws.close();
        }
    }

    console.log("Load test finished.");
}


runTest().catch(error => {

    console.error("\nUnexpected test error:");
    console.error(error);

    closeConnections();
});