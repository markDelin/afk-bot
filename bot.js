const { createClient, ping } = require('bedrock-protocol');

const config = {
  host: 'wtfraf.aternos.me', // Your Aternos address
  port: 56911,               // Check this on Aternos "Connect" button!
  username: '§l§bAFK§r_§l§cbot',       // Needs XBOX auth if online mode
  offline: true             // 'Cracked' mode enabled! No Microsoft Login needed.
};

const dns = require('dns');

const readline = require('readline');

// Global state bucket
const log = (msg) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}`);
};

let botState = {
    pos: { x: 0, y: 0, z: 0 },
    rot: { yaw: 0, pitch: 0 },
    runtimeEntityId: 0,
    tick: 0,
    autoMoveEnabled: true
};

// Global RL to avoid re-creation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function createBot() {
  log(`[DNS] Resolving auto-connect IP/Port for ${config.host}...`);
  
  // Aternos Bedrock uses _minecraft._udp
  dns.resolveSrv(`_minecraft._udp.${config.host}`, (err, addresses) => {
    let connectPort = config.port;
    if (!err && addresses && addresses.length > 0) {
       log('[DNS] Found SRV record:', addresses[0]);
       connectPort = addresses[0].port;
    } else {
       log('[DNS] No SRV record found. Using configured port.');
    }

    log(`[INIT] Pinging ${config.host}:${connectPort} to verify connection...`);
    ping({ host: config.host, port: connectPort, timeout: 5000 }).then(res => {
      log(`[PING] Success! Server: ${res.motd} | Players: ${res.playersOnline}/${res.playersMax} | Version: ${res.version}`);
      const client = connect(connectPort);
      
      // CLI Handler - remove old listeners to prevent duplicates
      rl.removeAllListeners('line');
      rl.on('line', (input) => {
        handleCommand(client, '!' + input, 'CLI', botState); 
      });

    }).catch(err => {
      log(`[PING FAILED] ${err.message}`);
      const retryDelay = 30000 + Math.random() * 5000;
      log(`[RETRY] Server might be offline. Retrying in ${(retryDelay/1000).toFixed(1)} seconds...`);
      setTimeout(createBot, retryDelay);
    });
  });
}

function connect(port) {
  log(`[INIT] Connecting to ${config.host}:${port}...`);
  
  const client = createClient({
    host: config.host,
    port: port,
    username: config.username,
    offline: config.offline,
    // Add skipPing: true if ping was already done, but fine to leave defaults.
  });

  client.on('start_game', (packet) => {
    log('[GAME] Joined game!');
    
    botState.pos = packet.player_position;
    // Inspect rotation keys carefully
    // console.log('[DEBUG] Rotation from packet:', packet.rotation);
    if (packet.rotation) {
        botState.rot = { yaw: packet.rotation.z || packet.rotation.y || 0, pitch: packet.rotation.x || 0 };
    }
    botState.runtimeEntityId = packet.runtime_entity_id;
    botState.tick = packet.current_tick || 0; // Sync tick
    
    log(`[STATE] Initialized. Pos: ${formatPos(botState.pos)}, ID: ${botState.runtimeEntityId}, Tick: ${botState.tick}, Gamemode: ${packet.player_gamemode}`);
  });

  client.on('text', (packet) => {
    // console.log('[DEBUG] Text packet:', packet);
    if (packet.type === 'chat' || packet.type === 'translation') {
       const msg = packet.message || "";
       const source = packet.source_name || "Unknown";
       
       log(`[CHAT] <${source}> ${msg}`);
       if (msg.startsWith('!')) {
         handleCommand(client, msg, source, botState);
       }
    }
  });

  client.on('move_player', (packet) => {
    if (packet.runtime_id === botState.runtimeEntityId) {
       // Sync state
       botState.pos = packet.position;
       botState.rot = { yaw: packet.yaw, pitch: packet.pitch };
    }
  });

  client.on('join', () => {
    log('[LOGIN] Bot has joined the server.');
    startAntiAfk(client, botState);
  });

  client.on('disconnect', (packet) => {
    log('[DISCONNECT] Packet received:', packet);
  });

  client.on('kick', (packet) => {
    log(`[KICKED] ${packet.message}`);
    const retryDelay = 30000 + Math.random() * 5000;
    log(`[RETRY] Reconnecting in ${(retryDelay/1000).toFixed(1)} seconds...`);
    client.close(); // Ensure cleanup
    setTimeout(createBot, retryDelay);
  });

  client.on('close', () => {
    const retryDelay = 30000 + Math.random() * 5000;
    log(`[CLOSE] Connection closed. Reconnecting in ${(retryDelay/1000).toFixed(1)} seconds...`);
    client.removeAllListeners(); // Cleanup
    setTimeout(createBot, retryDelay);
  });

  client.on('error', (err) => {
    log(`[ERROR] ${err.message}`);
  });
  
  return client;
}

function handleCommand(client, msg, source, botState) {
  let content = msg;
  if(content.startsWith('!')) content = content.slice(1);
  
  const args = content.trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  log(`[CMD] ${source} executed: ${command}`);

  if (command === 'start') {
    botState.autoMoveEnabled = true;
    startAntiAfk(client, botState);
    // if(source !== 'CLI') sendChat(client, `[Bot] Auto-move started.`);
    log('[CONTROL] Auto-move STARTED.');
    return;
  } 
  
  if (command === 'stop') {
    botState.autoMoveEnabled = false;
    log('[CONTROL] Auto-move DISABLED.');
    // if(source !== 'CLI') sendChat(client, `[Bot] Auto-move stopped.`);
    return;
  }

  if (command === 'say') {
     const sayMsg = args.join(' ');
     // sendChat(client, sayMsg);
     log(`[CONTROL] Say command received (ignored to prevent crash): ${sayMsg}`);
     return;
  }


}

function sendChat(client, msg) {
  client.queue('text', {
      type: 'chat', needs_translation: false, source_name: '', xuid: '', platform_chat_id: '',
      filtered_message: '', // Required in 1.21+
      message: msg
  });
}

function startAntiAfk(client, botState) {
  log('[AFK] Anti-AFK started with randomized intervals.');

  const performAction = () => {
    if (client.status !== 'play_status' && client.status !== 'joined') return; // 'joined' is often the status key in some versions, but 'play_status' is reliable.
    if (!botState.autoMoveEnabled) {
        setTimeout(performAction, 5000); // Check again soon
        return;
    }

    // Randomize action
    const r = Math.random();
    
    if (r < 0.5) {
        // Swing Arm
        client.queue('animate', {
            action_id: 1, 
            runtime_entity_id: botState.runtimeEntityId
        });
        log('[AFK] Action: Swing Arm');
    } else {
        // Sneak / Unsneak
        // 1=start sneak, 2=stop sneak
        client.queue('entity_action', {
            runtime_entity_id: botState.runtimeEntityId,
            action_id: 'start_sneak'
        });
        
        // Unsneak after a short delay
        setTimeout(() => {
             client.queue('entity_action', {
                runtime_entity_id: botState.runtimeEntityId,
                action_id: 'stop_sneak'
            });
        }, 500 + Math.random() * 500);

        log('[AFK] Action: Sneak cycle');
    }

    // Schedule next action (20s to 45s)
    const nextInterval = 20000 + Math.random() * 25000;
    setTimeout(performAction, nextInterval);
  };

  performAction();
}



function formatPos(pos) {
    if (!pos) return "null";
    return `x:${pos.x.toFixed(2)}, y:${pos.y.toFixed(2)}, z:${pos.z.toFixed(2)}`;
}

createBot();
