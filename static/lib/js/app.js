// js utils to interact with smart contract from wallet ext.

// const solanaWeb3 = require('@solana/web3.js');
// Ensure buffer is available
// const Buffer = buffer.Buffer

// const TOKEN_PROGRAM_ID = new PublicKey(document.querySelector("#token-program-id > label > div > textarea").value);

// Classes

// Define the WelcomeInstruction class

// Définir la classe InstructionData
class InstructionData {
    constructor(fields = {}) {
        this.instruction = fields.instruction || 2; // Par défaut à l'instruction index 2
        this.data = fields.data || new Uint8Array(); // Initialiser 'data' comme un Uint8Array vide
    }
}

// Constants

// Définir le schéma pour les données d'instruction
const welcomeInstructionSchema = new Map([
    [InstructionData, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['data', ['u8']], // Définir 'data' comme un tableau d'octets
        ],
    }],
]);


// Functions

// Récupérer le JWT depuis le backend
async function getToken() {
    const response = await fetch("http://localhost:8000/get-token", { method: "POST" });
    const data = await response.json();
    console.log("Got token: ", data.token);
    localStorage.setItem("jwt", data.token);
}

// Fonction pour envoyer une requête RPC avec JWT
async function customFetch(url, options) {
    console.log("Checking for JTW token...");
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No JWT token!");
        return;
    } else {
        console.log("Found token; requesting data...");
    }

    const response = await fetch("http://localhost:8000/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: options.body
    });

    return response.json();
}

async function findTokenAccountAddress(mintPublicKey, ownerPublicKey) {
    // Define the seeds
    const seeds = [
        '1',
        mintPublicKey.toBuffer(),
        ownerPublicKey.toBuffer(),
        // TOKEN_PROGRAM_ID.toBuffer(),
    ];
    const programId = new solanaWeb3.PublicKey(document.querySelector("#contract-address > label > div > textarea").value); 

    // Compute the token account address
    const [tokenAccountAddress] = await solanaWeb3.PublicKey.findProgramAddress(
      seeds,
      programId
    );
  
    return tokenAccountAddress;
}

// Check if wallet is installed
function getProvider() {
    if (window.solflare) {
        const provider = window.solflare;
        return provider;
        // Connect to Solflare
        // return solflare.connect().then(() => {
        //     console.log('Connected to Solflare');
        //     // return solflare;
        //     const publicKey = solflare.publicKey;
        //     console.log("Public Key: ", publicKey.toBase58());
        //     return publicKey;
        // }).catch((err) => {
        //     console.error('Connection to Solflare failed:', err);
        //     const publicKey = null;
        //     return publicKey;
        // });
    } else if ('solana' in window) {
        const provider = window.solana;
        if (provider.isPhantom) {
            // console.log('Connected to Phantom');
            return provider;
            // return provider.connect().then(() => {
            //     const publicKey = resp.publicKey;
            //     return publicKey;
            // }).catch((err) => {
            //     console.error('Connection to Phantom failed:', err);

            // });
        } else {
            alert('Sorry! We know you have a Solana wallet, but we currently only support Phantom and Solflare wallets. Please install one of them.');
            window.open("https://phantom.app/", "_blank");
            return null;
        }
    } else {
        alert('Solana wallet not found. Please install Phantom or Solflare wallet.');
        window.open("https://phantom.app/", "_blank");
        return null;
    }
}


// Fonction pour créer les données d'instruction de bienvenue
function createWelcomeInstructionData() {
    return new InstructionData({
        instruction: 2,
        data: new Uint8Array([/* vos données ici */]),
    });
}


/**
 * Dynamically compute the Anchor instruction discriminator in the browser.
 * @param {string} instructionName - The short name of the instruction (e.g., "welcome")
 * @returns {Promise<Uint8Array>} The first 8 bytes of the SHA-256 hash as a Uint8Array
 */
async function computeInstructionDiscriminator(instructionName) {
    // Construct the "global:<instruction_name>" string as Anchor does internally.
    const discriminatorString = `global:${instructionName}`;
  
    // Convert the string to a Uint8Array for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(discriminatorString);
  
    // Use SubtleCrypto to compute SHA-256 in a browser context
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  
    // Extract the first 8 bytes from the 32-byte hash
    return new Uint8Array(hashBuffer.slice(0, 8));
}

// Connect wallet
async function connectWallet() {
    console.log("Accessing provider...");
    const provider = getProvider();
    if (provider) {
        console.log("Found provider.");
        try {
            console.log("Connecting to wallet...");
            const resp = await provider.connect();
            const publicKey = resp.publicKey || provider.publicKey;
            pubKey = document.querySelector("#wallet-address > label > div > textarea")
            pubKey.value = publicKey.toBase58();
            pubKey.dispatchEvent(new Event('input'));
            document.querySelector("#wallet-address > label > span").innerText = "🔓 Wallet Address (Connected)";
            console.log("Connected to wallet: ", pubKey.value);

            // hide connect button
            document.getElementById('connectWalletButton').style.display = 'none';
            // show disconnect button
            document.getElementById('disconnectWalletButton').style.display = 'block';
            
            // click check balance button
            // document.getElementById('check-balance-btn').click();
            
            // Get energy mint address
            const energyMint = document.querySelector("#energy-mint > label > div > textarea").value;
            // Find the singularis program ID
            const energyAccountValue = await findTokenAccountAddress(new solanaWeb3.PublicKey(energyMint), publicKey);
            console.log("Energy Account Address: ", energyAccountValue.toBase58());
            if (energyAccountValue!== "1e") {
                const networkDropdown = document.querySelector("#network > div.container > div > div.wrap-inner > div > input");
                // const network = 'https://api.devnet.solana.com'; //
                const network = 'https://rpc.api.singularicula.me'; //networkDropdown.value;
                // getToken();
                // Création d'une instance de Connection qui utilise customFetch
                const connection = new solanaWeb3.Connection(network);
                console.log("Connectcting to network: ", network);
                connection.getParsedAccountInfo(energyAccountValue).then(async (accountInfo) => {
                    console.log("Got account info.");
                    if (!accountInfo || !accountInfo.value) {
                        console.log("Welcome");
                        const programId = new solanaWeb3.PublicKey(document.querySelector("#contract-address > label > div > textarea").value); 
                        const mint = new solanaWeb3.PublicKey(energyMint);
                        const transaction = new solanaWeb3.Transaction({
                            feePayer: publicKey,
                        });
                        // discriminator = await getInstructionDiscriminator("welcome");
                        // console.log("Discriminator: ", discriminator);
                        // Calculer le discriminant "welcome" (8 octets via SHA-256 de "global:welcome")
                        // Si crypto.subtle n'est pas supporté, calculez-le hors ligne et utilisez la valeur pré-calculée
                        // const encoder = new TextEncoder();
                        // crypto.subtle.digest("SHA-256", encoder.encode("welcome")).then((hashBuffer) => {
                            // const hashArray = Array.from(new Uint8Array(hashBuffer));
                            
                            // const discriminator = new Uint8Array(hashArray.slice(0,8));
                            // // Construire la donnée avec le discriminant attendu
                            // const data = discriminator // welcome instruction data at index 2
                            // Add instruction to the transaction
                        // let params = {}; // Welcome takes no parameters
                        // let welcomeStruct = {
                        //     index: 2,
                        //     layout: struct([u8("instruction")]),
                        // };
                        // const instructionData = Buffer.alloc(welcomeStruct.layout.span);
                        // let layoutFields = Object.assign({ instruction: welcomeStruct.index }, params);
                        // welcomeStruct.layout.encode(layoutFields, instructionData);
                            // const instructionData = Buffer.alloc(8);
                            // instructionData.writeUInt8(2, 7); // Add the 8-byte instruction identifier for index 2
                            // instructionData.set([2], 0); // Add the 8-byte instruction identifier for index 2
                            // Create the Welcome instruction data
                            // const instructionData = new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0]);
                        // Définir l'identifiant d'instruction de 8 octets
                        // Créer l'objet des données d'instruction
                        // const instructionData = createWelcomeInstructionData();

                        // // Sérialiser les données d'instruction en utilisant votre implémentation de Borsh
                        // const serializedData = serialize(welcomeInstructionSchema, instructionData);

                        // // Définir l'identifiant d'instruction de 8 octets
                        // const instructionIdentifier = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 2]); // Remplacez par l'identifiant correct

                        // // Combiner l'identifiant d'instruction et les données sérialisées
                        // const instructionDataWithId = new Uint8Array([...instructionIdentifier, ...serializedData]);
                        const systemProgramId = solanaWeb3.SystemProgram.programId;
                        const tokenProgramId = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
                        const rentSysvarId = solanaWeb3.SYSVAR_RENT_PUBKEY;
                        // Build the list of accounts in order, matching: signer, mint, account, rent, systemProgram, tokenProgram
                        const accounts = [
                            { pubkey: publicKey, isSigner: true, isWritable: true },
                            { pubkey: mint, isSigner: false, isWritable: true },
                            { pubkey: energyAccountValue, isSigner: false, isWritable: true },
                            { pubkey: rentSysvarId, isSigner: false, isWritable: false },
                            { pubkey: systemProgramId, isSigner: false, isWritable: false },
                            { pubkey: tokenProgramId, isSigner: false, isWritable: false }
                        ];
                        
                        console.log("Accounts: ", accounts);

                        // Compute the 8-byte discriminator for "welcome"
                        const welcomeDiscriminator = await computeInstructionDiscriminator("welcome");
                        // console.log("Instruction Data w/ ID: ", instructionDataWithId);
                        console.log("8-byte instruction discriminator:", welcomeDiscriminator);

                        // Utiliser instructionDataWithId comme données d'instruction
                        const instruction = new solanaWeb3.TransactionInstruction({
                            keys: accounts,
                            programId,
                            data: welcomeDiscriminator,
                        });

                        // Ajouter l'instruction à la transaction
                        transaction.add(instruction);
                        connection.getLatestBlockhash().then((latest) => {
                            console.log("Latest blockhash: ", latest);
                            transaction.recentBlockhash = latest.blockhash;
                            transaction.lastValidBlockHeight = latest.lastValidBlockHeight;
                            transaction.feePayer = publicKey;
                            // transaction.nonceInfo = { nonce: Uint8Array.from([]) };
                            console.log("Transaction: ", transaction);
                            provider.signAndSendTransaction(transaction, { skipPreflight: true,  }).then((signature) => {
                                console.log(`Welcome: Transaction sent with signature: ${JSON.stringify(signature)}`);
                            }).catch((error) => {
                                console.error("Welcome: Error sending transaction: ", error);
                                alert("Error sending transaction: Sorry for this inconvenience. We already know about this issue and have a fix, but we just need a few more SOL to upgrade the program. Please try again later.");
                            });
                        }).catch((error) => {
                            console.error("Welcome: Error getting latest blockhash: ", error);
                            //alert("Error getting latest blockhash: ", error);
                        });
                            // try {
                            //     const signedTransaction = await provider.signTransaction(transaction);
                            //     const signature = await connection.sendRawTransaction(signedTransaction.serialize());
                            //     await connection.confirmTransaction(signature, "confirmed");
                            //     console.log("Welcome: Transaction sent with signature:", signature);
                            // } catch (error) {
                            //     console.error("Transaction failed:", error);
                            // }
                        // });
                    } else {
                        console.log("Welcome back");
                    }
                });
            } else {
                console.log("Goodbye");
            }
        } catch (err) {
            console.error("Connection failed:", err);
        }
    } else {
        console.error("Provider not found.");
        console.log(provider);
    }
}

// Disconnect wallet
async function disconnectWallet() {
    if ('solana' in window) {
        const provider = window.solana;
        if (provider.isPhantom) {
            try {
                await provider.disconnect();
                //document.getElementById('wallet-address').innerText = "0x (Not connected)";
                pubkey = document.querySelector("#wallet-address > label > div > textarea")
                pubkey.value = "0x";
                pubkey.dispatchEvent(new Event('input'));
                document.querySelector("#wallet-address > label > span").innerText = "🔒 Wallet Address (Not connected)";
                // hide disconnect button
                document.getElementById('disconnectWalletButton').style.display = 'none';
                // show connect button
                document.getElementById('connectWalletButton').style.display = 'block';
                console.log("Goodbye");
            } catch (err) {
                console.error(err);
            }
        }
    }
}

// Update pickle

// function monitorPickle() {
//     let previousValue = "";

//     setInterval(() => {
//         let textbox = document.querySelector("#transformer-pickle > label > div.input-container > textarea");
//         if (textbox) {
//             let currentValue = textbox.value;
//             if (currentValue !== previousValue) {
//                 previousValue = currentValue;
//                 console.log("Pickle detected :", currentValue);
//                 onPickleChange(currentValue);
//             }
//         }
//     }, 500); // Vérifie toutes les 500ms
// }

// function onPickleChange(newValue) {
//     if (newValue === '789c6b60a99da20700056201c4') {
//         console.log("Pickle set to {}");
//     } else {
//         // alert("New pickle detected. Please press ok, then confirm the transaction to save your changes.");
//         transform();
//     }
// }

async function transform(transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase, pickle, pickle_data) {
    // const pckl = document.querySelector("#transformer-pickle > label > div.input-container > textarea").value;
    const transformer = document.querySelector("#transformer-address > label > div > textarea").value;
    // if (pckl) {
    //     if (pckl === '789c6b60a99da20700056201c4') {
    //         console.log("Pickle is empty.");
    //     } else {
            // Check if transformer is initialized
    const transformerPublicKey = new solanaWeb3.PublicKey(transformer);
    const networkDropdown = document.querySelector("#network > div.container > div > div.wrap-inner > div > input");
    const network = 'https://rpc.api.singularicula.me'; //networkDropdown.value;
    // getToken();
    const connection = new solanaWeb3.Connection(network, 'confirmed');
    console.log("Connectcting to network: ", network);
    const accountInfo = await connection.getParsedAccountInfo(transformerPublicKey) //.then(async (accountInfo) => {
    console.log("Got transformer info.");
    const systemProgramId = solanaWeb3.SystemProgram.programId;
    const rentSysvarId = solanaWeb3.SYSVAR_RENT_PUBKEY;
    const programId = new solanaWeb3.PublicKey(document.querySelector("#contract-address > label > div > textarea").value);
    const energyMint = document.querySelector("#energy-mint > label > div > textarea").value;
    const mint = new solanaWeb3.PublicKey(energyMint);
    // Convertir la chaîne pckl en octets
    // const encoder = new TextEncoder();
    // const pcklBytes = encoder.encode(pckl);
    // const pcklBytes = encoder.encode('789c6b60a99da20700056201c4');
    console.log("Accessing provider...");
    provider = getProvider();
    if (provider) {
        console.log("Found provider.");
        try {
            console.log("Connecting to wallet...");
            const resp = await provider.connect();
            const publicKey = resp.publicKey  || provider.publicKey;
            const transaction = new solanaWeb3.Transaction({
                feePayer: publicKey,
            });
            if (!accountInfo || !accountInfo.value) {
                // initialize the transformer
                console.log("Opening your transformer account...");
                const accounts = [
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: mint, isSigner: false, isWritable: true },
                    { pubkey: transformerPublicKey, isSigner: false, isWritable: true },
                    { pubkey: rentSysvarId, isSigner: false, isWritable: false },
                    { pubkey: systemProgramId, isSigner: false, isWritable: false },
                ];
                // Compute the 8-byte discriminator for "transform"
                const transformDiscriminator = await computeInstructionDiscriminator("transform");
                console.log("8-byte instruction discriminator:", transformDiscriminator);
                // const transformData = new Uint8Array(2);
                // // Encoder les données dans le tableau d'octets
                // transformData[0] = transformDiscriminator;
                // transformData[1] = pcklBytes;
                transformData = transformDiscriminator // new Uint8Array([...transformDiscriminator, ...pcklBytes]);
                instruction = new solanaWeb3.TransactionInstruction({
                    keys: accounts,
                    programId,
                    data: transformData,
                });
            } else {
                // or update the transformer
                console.log("Found transformer account");
                // console.log(transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase);
                // console.log(pickle, pickle_data);
                return [transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase, pickle, pickle_data]
                // const accounts = [
                //     { pubkey: publicKey, isSigner: true, isWritable: true },
                //     { pubkey: mint, isSigner: false, isWritable: true },
                //     { pubkey: transformerPublicKey, isSigner: false, isWritable: true },
                //     { pubkey: rentSysvarId, isSigner: false, isWritable: false },
                //     { pubkey: systemProgramId, isSigner: false, isWritable: false },
                // ];
                // // Compute the 8-byte discriminator for "improveTransform"
                // const updateTransformDiscriminator = await computeInstructionDiscriminator("improveTransform");
                // console.log("8-byte instruction discriminator:", updateTransformDiscriminator);
                // // const transformData = new Uint8Array(2);
                // // Encoder les données dans le tableau d'octets
                // // transformData[0] = updateTransformDiscriminator;
                // // transformData[1] = pcklBytes;
                // transformData = new Uint8Array([...updateTransformDiscriminator, ...pcklBytes]);
                // instruction = new solanaWeb3.TransactionInstruction({
                //     keys: accounts,
                //     programId,
                //     data: transformData,
                // });
            }
            // Ajouter l'instruction à la transaction
            transaction.add(instruction);
            const latest = await connection.getLatestBlockhash() //.then((latest) => {
            console.log("Latest blockhash: ", latest);
            transaction.recentBlockhash = latest.blockhash;
            transaction.lastValidBlockHeight = latest.lastValidBlockHeight;
            transaction.feePayer = provider.publicKey;
            // transaction.nonceInfo = { nonce: Uint8Array.from([]) };
            // transaction.programId = programId;
            console.log("Transaction: ", transaction);
            // if (!transaction.feePayer || !transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
            //     console.error("Transaction properties are missing");
            //     alert("Transaction properties are missing");
            //     return;
            // }
            const signature = provider.signAndSendTransaction(transaction, { skipPreflight: false }) //.then((signature) => {
            console.log(`Transform: Transaction sent with signature: ${JSON.stringify(signature)}`);
            // console.log(pickle, pickle_data);
            return [transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase, pickle, pickle_data]
            // }).catch((error) => {
            //     console.error("Error sending transaction: ", error);
            //     alert("Error sending transaction: ", error);
            //     return ["", {}]
            // });
            // }).catch((error) => {
            //     console.error("Error getting latest blockhash: ", error);
            //     alert("Error getting latest blockhash: ", error);
            //     return ["", {}]
            // });
        } catch (err) {
            console.error(err);
            // console.log(pickle, pickle_data);
            return [transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase, pickle, pickle_data]
        }
    }
    // console.log(pickle, pickle_data);
    return [transformer_energy, transformer_address, hf_models, hf_key, openai_models, openai_key, passphrase, pickle, pickle_data]
    // });
        // }
    // }
}

// monitorPickle();

function encodeU64(value) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(value), true); // true for little-endian
    return new Uint8Array(buffer);
}

async function checkMetabolizerAndProvisionEnergy() {
    console.log("Checking your metabolizer account...");
    const network = 'https://rpc.api.singularicula.me'; //document.querySelector("#network > div.container > div > div.wrap-inner > div > input").value;
    // getToken();
    const connection = new solanaWeb3.Connection(network, 'confirmed');
    console.log("Connectcting to network: ", network);
    const metabolizer_address = document.querySelector("#metabolizer-address > label > div.input-container > textarea").value;
    const metabolizerPublicKey = new solanaWeb3.PublicKey(metabolizer_address);
    await connection.getParsedAccountInfo(metabolizerPublicKey).then(async (accountInfo) => {
        console.log("Got metabolizer info.");
        console.log("Accessing provider...");
        provider = getProvider();
        if (provider) {
            console.log("Found provider.");
            try {
                console.log("Connecting to wallet...");
                const resp = await provider.connect();
                const publicKey = resp.publicKey || provider.publicKey;
                transaction = new solanaWeb3.Transaction({
                    feePayer: publicKey,
                });
                const programId = new solanaWeb3.PublicKey(document.querySelector("#contract-address > label > div > textarea").value);
                const systemProgramId = solanaWeb3.SystemProgram.programId;
                const rentSysvarId = solanaWeb3.SYSVAR_RENT_PUBKEY;
                accountChecked = false;
                if (!accountInfo || !accountInfo.value) {
                    // initialize the metabolizer
                    console.log("Opening your metabolizer account...");
                    const accounts = [
                        { pubkey: publicKey, isSigner: true, isWritable: true },
                        { pubkey: metabolizerPublicKey, isSigner: false, isWritable: true },
                        { pubkey: rentSysvarId, isSigner: false, isWritable: false },
                        { pubkey: systemProgramId, isSigner: false, isWritable: false },
                    ];
                    // Compute the 8-byte discriminator for "metabolize"
                    const metabolizeDiscriminator = await computeInstructionDiscriminator("metabolize");
                    console.log("8-byte instruction discriminator:", metabolizeDiscriminator);
                    metabolizeData = metabolizeDiscriminator;
                    instruction = new solanaWeb3.TransactionInstruction({
                        keys: accounts,
                        programId: programId,
                        data: metabolizeData,
                    });
                    transaction.add(instruction);
                    connection.getLatestBlockhash().then(async (latest) => {
                        console.log("Latest blockhash: ", latest);
                        transaction.recentBlockhash = latest.blockhash;
                        transaction.lastValidBlockHeight = latest.lastValidBlockHeight;
                        transaction.feePayer = provider.publicKey;
                        // transaction.nonceInfo = { nonce: Uint8Array.from([]) };
                        console.log("Transaction: ", transaction);
                        // if (!transaction.feePayer || !transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
                        //     console.error("Transaction properties are missing");
                        //     alert("Transaction properties are missing");
                        //     console.log(transaction.feePayer, transaction.recentBlockhash, transaction.lastValidBlockHeight);
                        //     return;
                        // }
                        provider.signAndSendTransaction(transaction, { skipPreflight: false }).then((signature) => {
                            console.log(`Metabolize: Transaction sent with signature: ${JSON.stringify(signature)}`);
                            accountChecked = true;
                        }).catch((error) => {
                            console.error("Error sending transaction: ", error);
                            alert("Error sending transaction: ", error);
                        });
                        // const signedTransaction = await provider.signTransaction(transaction);
                        // const signature = await connection.sendRawTransaction(signedTransaction.serialize());
                        // await connection.confirmTransaction(signature);
                        // console.log(`Metabolize: Transaction sent with signature: ${JSON.stringify(signature)}`);
                    }).catch((error) => {
                        console.error("Error getting latest blockhash: ", error);
                        alert("Error getting latest blockhash: ", error);
                    });
                } else {
                    // or update the metabloizer
                    console.log("Updating your metabolizer account...");
                    accountChecked = true;
                }
                if (accountChecked) {
                    console.log("Metabolizer account checked.");
                    // Make the provision
                    // provisionEnergy();
                    console.log("Provisioning energy...");
                    const tx = new solanaWeb3.Transaction({
                        feePayer: publicKey,
                    });
                    const energy_addres = document.querySelector("#energy-address > label > div > textarea").value;
                    const metabolizerEnergyAccountPublicKey = new solanaWeb3.PublicKey(energy_addres);
                    const singularity_energy_addres = document.querySelector("#singularity-address > label > div > textarea").value;
                    const singularityEnergyAccountPublicKey = new solanaWeb3.PublicKey(singularity_energy_addres);
                    const n_provisoin = document.querySelector("div > div.wrap > div.head > div > input").value;
                    if (!n_provisoin) {
                        console.error("Please enter the amount of energy to provision.");
                        return;
                    }
                    const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey(document.querySelector("#token-program-id > label > div > textarea").value);
                    await connection.getParsedAccountInfo(metabolizerEnergyAccountPublicKey).then(async (meaccountInfo) => {
                        console.log("Got metabolizer energy account info.");
                        if (!meaccountInfo || !meaccountInfo.value) {
                            // initialize the metabolizer energy account
                            console.error("Metabolizer energy account doesn't exist.");
                        } else {
                            await connection.getParsedAccountInfo(singularityEnergyAccountPublicKey).then(async (seaccountInfo) => {
                                console.log("Got singularity energy account info.");
                                if (!seaccountInfo || !seaccountInfo.value) {
                                    // initialize the singularity energy account
                                    console.error("Singularity energy account doesn't exist.");
                                } else {
                                    const accounts = [
                                        { pubkey: metabolizerPublicKey, isSigner: false, isWritable: true },
                                        { pubkey: metabolizerEnergyAccountPublicKey, isSigner: false, isWritable: true },
                                        { pubkey: singularityEnergyAccountPublicKey, isSigner: false, isWritable: true },
                                        { pubkey: publicKey, isSigner: true, isWritable: true },
                                        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                                    ];
                                    console.log("Accounts: ", accounts);
                                    // Compute the 8-byte discriminator for "provision"
                                    const provisionEnergyDiscriminator = await computeInstructionDiscriminator("provision");
                                    console.log("8-byte instruction discriminator:", provisionEnergyDiscriminator);
                                    // param: n : u64
                                    const nU64 = encodeU64(n_provisoin * 1e6);
                                    provisionEnergyData = new Uint8Array([...provisionEnergyDiscriminator, ...nU64]);
                                    instruction = new solanaWeb3.TransactionInstruction({
                                        keys: accounts,
                                        programId: programId,
                                        data: provisionEnergyData,
                                    });
                                    tx.add(instruction);
                                    connection.getLatestBlockhash().then(async (latest) => {
                                        console.log("Latest blockhash: ", latest);
                                        tx.recentBlockhash = latest.blockhash;
                                        tx.lastValidBlockHeight = latest.lastValidBlockHeight;
                                        tx.feePayer = provider.publicKey;
                                        // transaction.nonceInfo = { nonce: Uint8Array.from([]) };
                                        console.log("Transaction: ", tx);
                                        // if (!transaction.feePayer || !transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
                                        //     console.error("Transaction properties are missing");
                                        //     alert("Transaction properties are missing");
                                        //     console.log(transaction.feePayer, transaction.recentBlockhash, transaction.lastValidBlockHeight);
                                        //     return;
                                        // }
                                        provider.signAndSendTransaction(tx, { skipPreflight: false }).then((signature) => {
                                            console.log(`Provision: Transaction sent with signature: ${JSON.stringify(signature)}`);
                                        }).catch((error) => {
                                            console.error("Error sending transaction: ", error);
                                            alert("Error sending transaction: ", error);
                                        });
                                        // const signedTransaction = await provider.signTransaction(tx);
                                        // const signature = await connection.sendRawTransaction(signedTransaction.serialize());                
                                        // await connection.confirmTransaction(signature);
                                        // console.log(`Provision: Transaction sent with signature: ${JSON.stringify(signature)}`);
                                    }).catch((error) => {
                                        console.error("Error getting latest blockhash: ", error);
                                        alert("Error getting latest blockhash: ", error);
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.error("Metabolizer account could not be checked.");
                }
            } catch (err) {
                console.error(err);
            }
        }
    });
}

function sendMessage() {    
    // wait for the message to be sent
    setTimeout(() => {
        // get list of all messages
        const messages = document.querySelectorAll("div.bubble-wrap > div.message-wrap > div.message-row.bubble.user-row > div.role > div.user > div.message > div > div.message-content > span.prose");
        console.log("Message count in current converstion: ", messages.length);
        message = '';
        if (messages) {
            const lastMessage = messages.item(messages.length - 1);
            if (lastMessage) {
                message = lastMessage.innerText;
            } else {
                message = '';
            }
        } else {
            message = '';
        }
        if (message === '') {
            console.error("Please enter a message to send.");
            return;
        // } else if (message.startsWith('/') || message.startsWith('>') || message.startsWith('@') || message.startsWith('#') || message.startsWith('%') || message.startsWith('?') || message.startsWith('!')) {
        } else if (message.startsWith('/help') || message.startsWith('/welcome'))  {
            console.log("Special command detected: ", message);
            return;
        } else {
            console.log("Message: ", message);
            const energy_addres = document.querySelector("#energy-address > label > div > textarea").value;
            if (energy_addres) {
                if (energy_addres === '1e') {
                    // alert("Please connect your wallet to send messages.");
                    console.error('Please connect your wallet to send messages.')
                } else {
                    // alert("Sending message");
                    console.log("Preparing to send your message...")
        
                    // Make sure the metabolizer account exists
                    checkMetabolizerAndProvisionEnergy();
                }
            } else {
                console.error("Please connect your wallet.");
            }
        }
    }, 1000);
}

// async function sendTransaction(recipient, amount) {
//     if ('solana' in window) {
//         const provider = window.solana;
//         if (provider.isPhantom) {
//             try {
                    // getToken();
//                 const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
//                 const fromPubkey = provider.publicKey;
//                 const toPubkey = new solanaWeb3.PublicKey(recipient);
//                 const transaction = new solanaWeb3.Transaction().add(
//                     solanaWeb3.SystemProgram.transfer({
//                         fromPubkey,
//                         toPubkey,
//                         lamports: amount * 1e9,
//                     })
//                 );
//                 const { signature } = await provider.signAndSendTransaction(transaction);
//                 alert('Transaction sent with signature: ' + signature);
//             } catch (err) {
//                 console.error(err);
//             }
//         }
//     }
// }
