import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { NftStickers } from '../target/types/nft_stickers'
import assert from 'assert'
import { associatedAddress } from '@project-serum/anchor/dist/cjs/utils/token'
import { TOKEN_PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID } from '../helper/constants';
import { create } from '../helper/create-nft'
const { SystemProgram } = anchor.web3


describe('nft-stickers', () => {

    const provider = anchor.Provider.env()

    anchor.setProvider(provider)

    const program = anchor.workspace.NftStickers as Program<NftStickers>
    console.log(program.programId.toBase58())
    const wallet = anchor.web3.Keypair.generate();
    
    const relayerSeed = Buffer.from(anchor.utils.bytes.utf8.encode('relayer'))
    const satellite = anchor.utils.publicKey.findProgramAddressSync(
        [relayerSeed],
        program.programId
    );

    let firstMint;
    let firstNewMint;
    let firstTokenAccount; 
    let firstNewTokenAccount;
    let firstMetadata;
    let firstMasterEdition;
    let firstNewMetadata;
    let firstNewMasterEdition;
    let firstEditionMarker;

    let secondMint;
    let secondTokenAccount; 
    let secondMetadata;
    let secondMasterEdition;

    const impostor = anchor.web3.Keypair.generate();

    it('Cannot stake nft pack if is not the given token', async () => {

        const airdropSignature = await provider.connection.requestAirdrop(
            wallet.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await provider.connection.confirmTransaction(airdropSignature);

        const airdropSignature2 = await provider.connection.requestAirdrop(
            impostor.publicKey,
            anchor.web3.LAMPORTS_PER_SOL,
        );
        await provider.connection.confirmTransaction(airdropSignature2);

        const { mint, newMint, tokenAccount, newTokenAccount, metadata, masterEdition, newMetadata, newMasterEdition} = await create(provider, wallet, satellite[0], 0)

        firstMint = mint;
        firstNewMint = newMint;
        firstTokenAccount = tokenAccount;
        firstNewTokenAccount = newTokenAccount;
        firstMetadata = metadata;
        firstMasterEdition = masterEdition;
        firstNewMetadata = newMetadata;
        firstNewMasterEdition = newMasterEdition;

        try{
            const tx = await program.rpc.stakeMasterEdition({
                accounts:{
                mint: firstNewMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: wallet.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = 'Metadata differs from Mint provided'
            assert.equal(errMsg, error.msg)
        }
        
    })

    it('Cannot stake nft pack if satellite account is not among creators', async () => {

        console.log(await provider.connection.getBalance(wallet.publicKey))

        const { mint, newMint, tokenAccount, newTokenAccount, metadata, masterEdition, newMetadata, newMasterEdition} = await create(provider, wallet, impostor.publicKey, 0)

        secondMint = mint;
        secondTokenAccount = tokenAccount;
        secondMetadata = metadata;
        secondMasterEdition = masterEdition;
        
        try{
            const tx = await program.rpc.stakeMasterEdition({
                accounts:{
                mint: secondMint,
                associatedTokenAccount: secondTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: wallet.publicKey,
                metadata: secondMetadata,
                masterEdition: secondMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = 'Satellite must be listed as one of the creators'
            assert.equal(errMsg, error.msg)
        }
        
    })

    it('Impostor cannot stake nft pack because cannot be the update authority of the nft', async () => {
        
        try{
            const tx = await program.rpc.stakeMasterEdition({
                accounts:{
                mint: firstMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: impostor.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [impostor],
            });
        } catch(error) {
            const errMsg = 'A signature was required but not found'
            assert.equal(errMsg, error.logs[4].split('.')[3].split('Error Message: ')[1])
        }
        
    })

    it('Stake nft pack for satellite account', async () => {
       
        const tx = await program.rpc.stakeMasterEdition({
            accounts:{
            mint: firstMint,
            associatedTokenAccount: firstTokenAccount.address,
            relayer: satellite[0],
            updateAuthority: wallet.publicKey,
            metadata: firstMetadata,
            masterEdition: firstMasterEdition,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [wallet],
        });
        
             
    })

    it('Cannot stake again nft pack for satellite account', async () => {
      
        try {
            const tx = await program.rpc.stakeMasterEdition({
                accounts:{
                mint: firstMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: wallet.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = 'owner does not match'
            assert.equal(errMsg, error.logs[4].split('Error: ')[1])
        }
             
    })

    it('Impostor cannot unstake ', async () => {
      
        try {
            const tx = await program.rpc.unstakeMasterEdition({
                accounts:{
                mint: firstMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: impostor.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [impostor],
            });
        } catch(error) {
            const errMsg = 'A signature was required but not found'
            assert.equal(errMsg, error.logs[2].split('.')[3].split('Error Message: ')[1])
        }
             
    })

    it('Cannot unstake nft pack if is not the given token', async () => {

        try{
            const tx = await program.rpc.unstakeMasterEdition({
                accounts:{
                mint: firstNewMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: wallet.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = 'Metadata differs from Mint provided'
            assert.equal(errMsg, error.msg)
        }
        
    })

    it('unstake nft pack for satellite account', async () => {
       
        const tx = await program.rpc.unstakeMasterEdition({
            accounts:{
            mint: firstMint,
            associatedTokenAccount: firstTokenAccount.address,
            relayer: satellite[0],
            updateAuthority: wallet.publicKey,
            metadata: firstMetadata,
            masterEdition: firstMasterEdition,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [wallet],
        });
        
             
    })

    it('Cannot unstake again nft pack for satellite account', async () => {
      
        try {
            const tx = await program.rpc.unstakeMasterEdition({
                accounts:{
                mint: firstMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: satellite[0],
                updateAuthority: wallet.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = 'owner does not match'
            assert.equal(errMsg, error.logs[4].split('Error: ')[1])
        }
             
    })

    it('Stake nft pack for satellite account with new max supply', async () => {
        
        const { mint, newMint, tokenAccount, newTokenAccount, metadata, masterEdition, newMetadata, newMasterEdition, editionMarker} = await create(provider, wallet, satellite[0], 1)

        firstMint = mint;
        firstNewMint = newMint;
        firstTokenAccount = tokenAccount;
        firstNewTokenAccount = newTokenAccount;
        firstMetadata = metadata;
        firstMasterEdition = masterEdition;
        firstNewMetadata = newMetadata;
        firstNewMasterEdition = newMasterEdition;
        firstEditionMarker = editionMarker;

       
        const tx = await program.rpc.stakeMasterEdition({
            accounts:{
            mint: firstMint,
            associatedTokenAccount: firstTokenAccount.address,
            relayer: satellite[0],
            updateAuthority: wallet.publicKey,
            metadata: firstMetadata,
            masterEdition: firstMasterEdition,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [wallet],
        });
        
             
    })

    it('Cannot unstake if the owner is an impostor', async () => {
      
        try {
            const tx = await program.rpc.unstakeMasterEdition({
                accounts:{
                mint: firstMint,
                associatedTokenAccount: firstTokenAccount.address,
                relayer: impostor.publicKey,
                updateAuthority: wallet.publicKey,
                metadata: firstMetadata,
                masterEdition: firstMasterEdition,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [wallet],
            });
        } catch(error) {
            const errMsg = impostor.publicKey.toBase58() + "'s signer privilege escalated"
            assert.equal(errMsg, error.logs[2])
        }
             
    })

    it('Cannot mint new edition if owner is not satellite', async () => {
      
        try {
            const edition = new anchor.BN(1)
            const tx_mint_new_edition = await program.rpc.mintNewEdition(edition, {
                accounts:{
                newMetadata: firstNewMetadata,
                newEdition: firstNewMasterEdition,
                masterEdition: firstMasterEdition,
                newMint: firstNewMint,
                editionMarker: firstEditionMarker,
                newMintAuthority: wallet.publicKey,
                payer: wallet.publicKey,
                relayer: wallet.publicKey,
                associatedTokenAccount: firstTokenAccount.address,
                metadata: firstMetadata,
                newUpdateAuthority: wallet.publicKey,
                mint: firstMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                metadataProgram: new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY
                },
                signers: [wallet],
                });
           
        } catch(error) {
            const errMsg = 'The given account is owned by a different program than expected'
            assert.equal(errMsg, error.msg)
        }
             
    })

    it('Mint new edition', async () => {
    
        const edition = new anchor.BN(1)
        const tx_mint_new_edition = await program.rpc.mintNewEdition(edition, {
            accounts:{
            newMetadata: firstNewMetadata,
            newEdition: firstNewMasterEdition,
            masterEdition: firstMasterEdition,
            newMint: firstNewMint,
            editionMarker: firstEditionMarker,
            newMintAuthority: wallet.publicKey,
            payer: wallet.publicKey,
            relayer: satellite[0],
            associatedTokenAccount: firstTokenAccount.address,
            metadata: firstMetadata,
            newUpdateAuthority: wallet.publicKey,
            mint: firstMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            metadataProgram: new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY
            },
            signers: [wallet],
            });
            
    
    })

    it('Unstake', async () => {
        
        const tx = await program.rpc.unstakeMasterEdition({
            accounts:{
            mint: firstMint,
            associatedTokenAccount: firstTokenAccount.address,
            relayer: satellite[0],
            updateAuthority: wallet.publicKey,
            metadata: firstMetadata,
            masterEdition: firstMasterEdition,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [wallet],
        });
       
    })

})