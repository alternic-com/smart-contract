import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, MINT_SIZE, getMinimumBalanceForRentExemptMint, createInitializeMintInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Escrow } from "../target/types/escrow";
import { randomBytes } from "crypto";
import { assert } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const provider = anchor.getProvider();

  it("Setting Up, Mint Accounts, ATA's, Mint Tokens", async () => {
    const maker = Keypair.fromSecretKey(new Uint8Array([249, 53, 151, 93, 232, 251, 119, 58, 247, 123, 12, 181, 48, 158, 145, 249, 80, 93, 155, 59, 80, 35, 17, 216, 19, 5, 34, 111, 2, 6, 227, 89, 97, 141, 73, 33, 204, 189, 51, 254, 42, 85, 248, 35, 184, 110, 43, 81, 111, 85, 93, 94, 63, 245, 203, 115, 53, 235, 182, 140, 249, 200, 8, 204]));

    const taker = Keypair.fromSecretKey(new Uint8Array([3, 183, 242, 179, 150, 59, 210, 239, 230, 79, 78, 129, 41, 69, 77, 67, 248, 192, 40, 18, 92, 1, 100, 113, 138, 184, 0, 228, 208, 28, 43, 182, 192, 213, 116, 109, 20, 62, 120, 94, 173, 156, 25, 13, 144, 177, 44, 247, 88, 126, 247, 173, 137, 169, 5, 69, 188, 205, 2, 121, 205, 30, 244, 130]));

    const airdropAmount = 10 * LAMPORTS_PER_SOL;

    // airdrop SOL in parallel
    const [makerSig, takerSig] = await Promise.all([
      provider.connection.requestAirdrop(maker.publicKey, airdropAmount),
      provider.connection.requestAirdrop(taker.publicKey, airdropAmount)
    ]);

    await Promise.all([
      provider.connection.confirmTransaction(makerSig, 'confirmed'),
      provider.connection.confirmTransaction(takerSig, 'confirmed')
    ]);

    // create both mints first (parallel)
    const mintDomain = Keypair.generate();
    const mintCurrency = Keypair.generate();

    const makerAtaDomain = getAssociatedTokenAddressSync(mintDomain.publicKey, maker.publicKey);
    const takerAtaCurrency = getAssociatedTokenAddressSync(mintCurrency.publicKey, taker.publicKey);

    const mintCreationTxA = new Transaction().add(
      // 1. CREATE: Allocate space on-chain for the new mint account
      //    - Pays rent to make account rent-exempt
      //    - Assigns ownership to Token Program
      //    - Creates empty account with MINT_SIZE bytes
      SystemProgram.createAccount({
        fromPubkey: maker.publicKey,        // Who pays for the account creation
        newAccountPubkey: mintDomain.publicKey,  // Address of the new mint account
        space: MINT_SIZE,                   // Size needed for mint data (82 bytes)
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection), // Rent deposit
        programId: TOKEN_PROGRAM_ID         // Token Program will own this account
      }),

      // 2. INITIALIZE: Configure the mint with decimals and authorities
      //    - Sets decimal precision (9 = can have 0.000000001 tokens)
      //    - mint_authority: who can create new tokens
      //    - freeze_authority: who can freeze token accounts (same as mint_authority here)
      createInitializeMintInstruction(
        mintDomain.publicKey,// The mint account to initialize
        0,                   // Decimal places (0 = nft)
        maker.publicKey,    // Mint authority (can create new tokens)
        maker.publicKey     // Freeze authority (can freeze accounts)
      ),

      // 3. CREATE ATA: Create Associated NFT Domainccount for the maker to hold tokens
      //    - Deterministic address based on (owner + mint)
      //    - Standard way to hold SPL tokens
      createAssociatedTokenAccountInstruction(
        maker.publicKey,    // Payer for ATA creation
        makerAtaDomain,         // The ATA address (computed earlier)
        maker.publicKey,    // Owner of the token account
        mintDomain.publicKey     // Which mint this ATA is for
      ),

      // 4. MINT TOKENS: Create 100 tokens and deposit them into maker's ATA
      //    - Only mint_authority can do this
      //    - Increases total supply of the token
      createMintToInstruction(
        mintDomain.publicKey,    // Which mint to create tokens from
        makerAtaDomain,         // Destination token account
        maker.publicKey,    // Mint authority (must sign transaction)
        1                 // Amount to mint (in smallest unit, so 1 token)
      )
    );

    const mintCreationTxB = new Transaction().add(
      // 1. CREATE: Allocate space on-chain for the new mint account
      //    - Pays rent to make account rent-exempt
      //    - Assigns ownership to Token Program
      //    - Creates empty account with MINT_SIZE bytes
      SystemProgram.createAccount({
        fromPubkey: taker.publicKey,        // Who pays for the account creation
        newAccountPubkey: mintCurrency.publicKey,  // Address of the new mint account
        space: MINT_SIZE,                   // Size needed for mint data (82 bytes)
        lamports: await getMinimumBalanceForRentExemptMint(provider.connection), // Rent deposit
        programId: TOKEN_PROGRAM_ID         // Token Program will own this account
      }),

      // 2. INITIALIZE: Configure the mint with decimals and authorities
      //    - Sets decimal precision (9 = can have 0.000000001 tokens)
      //    - mint_authority: who can create new tokens
      //    - freeze_authority: who can freeze token accounts (same as mint_authority here)
      createInitializeMintInstruction(
        mintCurrency.publicKey,    // The mint account to initialize
        9,                  // Decimal places (9 = standard SPL token precision)
        taker.publicKey,    // Mint authority (can create new tokens)
        taker.publicKey     // Freeze authority (can freeze accounts)
      ),

      // 3. CREATE ATA: Create Associated NFT Domainccount for the taker to hold tokens
      //    - Deterministic address based on (owner + mint)
      //    - Standard way to hold SPL tokens
      createAssociatedTokenAccountInstruction(
        taker.publicKey,    // Payer for ATA creation
        takerAtaCurrency,         // The ATA address (computed earlier)
        taker.publicKey,    // Owner of the token account
        mintCurrency.publicKey     // Which mint this ATA is for
      ),

      // 4. MINT TOKENS: Create 100 tokens and deposit them into taker's ATA
      //    - Only mint_authority can do this
      //    - Increases total supply of the token
      createMintToInstruction(
        mintCurrency.publicKey,    // Which mint to create tokens from
        takerAtaCurrency,         // Destination token account
        taker.publicKey,    // Mint authority (must sign transaction)
        100                 // Amount to mint (in smallest unit, so 100 tokens)
      )
    );

    //  mint creation 
    const [signatureMaker, signatureTaker] = await Promise.all([
      sendAndConfirmTransaction(provider.connection, mintCreationTxA, [maker, mintDomain]),
      sendAndConfirmTransaction(provider.connection, mintCreationTxB, [taker, mintCurrency])
    ]);

    console.log(
      `Your transaction signature Maker: https://explorer.solana.com/transaction/${signatureMaker}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`
    );
    console.log(
      `Your transaction signature Taker: https://explorer.solana.com/transaction/${signatureTaker}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`
    );

    // now create cross ATAs 
    const makerAtaCurrency = getAssociatedTokenAddressSync(mintCurrency.publicKey, maker.publicKey);
    const takerAtaA = getAssociatedTokenAddressSync(mintDomain.publicKey, taker.publicKey);

    const crossAtaTxMaker = new Transaction().add(
      createAssociatedTokenAccountInstruction(maker.publicKey, makerAtaCurrency, maker.publicKey, mintCurrency.publicKey)
    );

    const crossAtaTxTaker = new Transaction().add(
      createAssociatedTokenAccountInstruction(taker.publicKey, takerAtaA, taker.publicKey, mintDomain.publicKey)
    );

    // cross ATA creation in parallel
    await Promise.all([
      sendAndConfirmTransaction(provider.connection, crossAtaTxMaker, [maker]),
      sendAndConfirmTransaction(provider.connection, crossAtaTxTaker, [taker])
    ]);

    console.log("\n=== ESCROW SETUP COMPLETE ===");
    console.log("Mint Domain:", mintDomain.publicKey.toBase58());
    console.log("Mint Currency:", mintCurrency.publicKey.toBase58());
    console.log("Maker's ATA Domain:", makerAtaDomain.toBase58());
    console.log("Maker's ATA Currency:", makerAtaCurrency.toBase58());
    console.log("Taker's ATA Domain:", takerAtaA.toBase58());
    console.log("Taker's ATA Currency:", takerAtaCurrency.toBase58());

    // verify balances
    const [makerBalance, takerBalance] = await Promise.all([
      getAccount(provider.connection, makerAtaDomain),
      getAccount(provider.connection, takerAtaCurrency)
    ]);

    console.log("\n")

    console.log("Maker balance (Mint Domain):", Number(makerBalance.amount), "tokens");
    console.log("Taker balance (Mint Currency):", Number(takerBalance.amount), "tokens");

    console.log("\n============================================================\n")

    // escrow pda 
    const seed = new BN(randomBytes(8));
    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];
    const vault = getAssociatedTokenAddressSync(
      mintDomain.publicKey,
      escrow,
      true,
      TOKEN_PROGRAM_ID
    );
    console.log("Escrow PDA:", escrow.toBase58());
    console.log("Vault PDA:", vault.toBase58());
    console.log("Seed:", seed.toString());

    // Store for escrow tests
    global.escrowSetup = {
      maker,
      taker,
      mintDomain,
      mintCurrency,
      makerAtaDomain,
      makerAtaCurrency,
      takerAtaA,
      takerAtaCurrency,
      escrow,
      vault,
      seed
    };
  });

  it("Deposit", async () => {
    try {
      // Test parameters
      //const seed = new anchor.BN(12345);        // Random seed for escrow PDA
      const depositAmount = new anchor.BN(1);   // Amount of NFT Domain to deposit
      const receiveAmount = new anchor.BN(75);   // Amount of Token Currency maker wants to receive

      // Get the test setup data (assumes previous setup test ran)
      const { maker, mintDomain, mintCurrency, makerAtaDomain, seed } = global.escrowSetup;

      // Calculate PDA addresses
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          maker.publicKey.toBuffer(),
          seed.toArrayLike(Buffer, "le", 8)  // Convert BN to 8-byte little-endian buffer
        ],
        program.programId
      );

      const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          escrowPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mintDomain.publicKey.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("=== MAKE INSTRUCTION TEST ===");
      console.log("Seed:", seed.toString());
      console.log("Deposit Amount:", depositAmount.toString());
      console.log("Receive Amount:", receiveAmount.toString());
      console.log("Escrow PDA:", escrowPda.toBase58());
      console.log("Vault PDA:", vaultPda.toBase58());

      // Get maker's initial NFT Domain balance
      const makerAtaDomainBefore = await getAccount(provider.connection, makerAtaDomain);
      console.log("Maker's NFT Domain balance before:", Number(makerAtaDomainBefore.amount));

      // Execute the deposit instruction
      const signature = await program.methods
        .deposit(seed)
        .accounts({
          maker: maker.publicKey,
          mintDomain: mintDomain.publicKey,
          mintCurrency: mintCurrency.publicKey,
          makerAtaDomain: makerAtaDomain,
          escrow: escrowPda,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([maker])
        .rpc();

      console.log(`Signer ${maker.publicKey}`);

      console.log(`\nMake transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`);

      // ===== VERIFICATION =====

      // 1. Check that escrow account was created with correct data
      const escrowAccount = await program.account.escrowState.fetch(escrowPda);
      console.log("\n=== ESCROW STATE VERIFICATION ===");
      console.log("Escrow Seed:", escrowAccount.seed.toString());
      console.log("Escrow Maker:", escrowAccount.maker.toBase58());
      console.log("Escrow Mint Domain:", escrowAccount.mintDomain.toBase58());
      console.log("Escrow Mint Currency:", escrowAccount.mintCurrency.toBase58());

      // Verify escrow state
      assert.equal(escrowAccount.seed.toString(), seed.toString(), "Seed mismatch");
      assert.equal(escrowAccount.maker.toBase58(), maker.publicKey.toBase58(), "Maker mismatch");
      assert.equal(escrowAccount.mintDomain.toBase58(), mintDomain.publicKey.toBase58(), "Mint Domain mismatch");
      assert.equal(escrowAccount.mintCurrency.toBase58(), mintCurrency.publicKey.toBase58(), "Mint Currency mismatch");

      // 2. Check that vault was created and received the deposited tokens
      const vaultAccount = await getAccount(provider.connection, vaultPda);
      console.log("\n=== VAULT VERIFICATION ===");
      console.log("Vault NFT Domain balance:", Number(vaultAccount.amount));
      console.log("Vault Mint:", vaultAccount.mint.toBase58());
      console.log("Vault Owner:", vaultAccount.owner.toBase58());

      // Verify vault state
      assert.equal(Number(vaultAccount.amount), depositAmount.toNumber(), "Vault balance mismatch");
      assert.equal(vaultAccount.mint.toBase58(), mintDomain.publicKey.toBase58(), "Vault mint mismatch");
      assert.equal(vaultAccount.owner.toBase58(), escrowPda.toBase58(), "Vault owner should be escrow PDA");

      // 3. Check that maker's NFT Domain balance decreased by deposit amount
      const makerAtaDomainAfter = await getAccount(provider.connection, makerAtaDomain);
      console.log("\n=== MAKER BALANCE VERIFICATION ===");
      console.log("Maker's NFT Domain balance after:", Number(makerAtaDomainAfter.amount));

      const expectedMakerBalance = Number(makerAtaDomainBefore.amount) - depositAmount.toNumber();
      assert.equal(Number(makerAtaDomainAfter.amount), expectedMakerBalance, "Maker balance didn't decrease correctly");

      console.log("\n✅ Make instruction executed successfully!");
      console.log(`✅ Escrow created with ${depositAmount} NFT Domain deposited`);
      console.log(`✅ Maker wants ${receiveAmount} Token Currency in return`);

      console.log("\n============================================================\n")

      // Store escrow info for subsequent tests
      global.escrowTest = {
        escrowPda,
        vaultPda,
        seed,
        depositAmount,
        receiveAmount
      };

    } catch (error) {
      console.error(`❌ Something went wrong in Make: ${error}`);
      console.error("Full error:", error);
      throw error;
    }
  });

  // 🆕 NEW TEST: Make Sell Offer
  it("Make Sell Offer", async () => {
    const { maker, mintCurrency } = global.escrowSetup;
    const { escrowPda } = global.escrowTest;

    const sellAmount = new BN(42); // Example price
    const escrowBefore = await program.account.escrowState.fetch(escrowPda);
    console.log("\n=== MAKE SELL OFFER TEST ===");
    console.log("Sell Amount on escrow before:", escrowBefore.wantedSellAmount.toString());
    console.log("Maker:", maker.publicKey.toBase58());
    console.log("Escrow:", escrowPda.toBase58());
    console.log("Sell Amount:", sellAmount.toString());

    // Verify that before making a sell offer, the amount is indeed 0
    assert.equal(
      escrowBefore.wantedSellAmount.toString(),
      "0",
      "Wanted sell amount should be 0 before making an offer"
    );


    const txSig = await program.methods
      .makeSellOffer(sellAmount)
      .accounts({
        maker: maker.publicKey,
        escrow: escrowPda,
        mintCurrency: mintCurrency.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    console.log(
      `Transaction: https://explorer.solana.com/tx/${txSig}?cluster=custom&customUrl=${provider.connection.rpcEndpoint}`
    );

    const escrowAfter = await program.account.escrowState.fetch(escrowPda);

    console.log("\n=== ESCROW AFTER SELL OFFER ===");
    console.log("Wanted Sell Amount:", escrowAfter.wantedSellAmount.toString());
    console.log("Maker:", escrowAfter.maker.toBase58());
    console.log("Mint Currency:", escrowAfter.mintCurrency.toBase58());

    assert.equal(
      escrowAfter.wantedSellAmount.toString(),
      sellAmount.toString(),
      "Wanted sell amount not updated correctly"
    );

    assert.equal(
      escrowAfter.maker.toBase58(),
      maker.publicKey.toBase58(),
      "Maker should remain unchanged"
    );

    console.log("\n✅ Make Sell Offer executed successfully!");
    console.log("✅ Escrow updated with correct sell offer.\n");
  
  });

});