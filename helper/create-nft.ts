import * as anchor from '@project-serum/anchor';
import { PublicKey, clusterApiUrl, Transaction, sendAndConfirmTransaction, Connection } from '@solana/web3.js';
import {
    getOrCreateAssociatedTokenAccount,
    createMint,
    mintTo,
    Account,
  } from '@solana/spl-token';
import {
    createCreateMetadataAccountV2Instruction,
    CreateMetadataAccountV2InstructionArgs,
    CreateMetadataAccountArgsV2,
    CreateMetadataAccountV2InstructionAccounts,
    createCreateMasterEditionV3Instruction,
    MintNewEditionFromMasterEditionViaTokenArgs,
    MintNewEditionFromMasterEditionViaTokenInstructionArgs,
    MintNewEditionFromMasterEditionViaTokenInstructionAccounts,
    createMintNewEditionFromMasterEditionViaTokenInstruction,
    Creator,
    DataV2,
    mintNewEditionFromMasterEditionViaTokenArgsBeet,
} from '@metaplex-foundation/mpl-token-metadata';
import { 
    TOKEN_METADATA_PROGRAM_ID, 
    TOKEN_PROGRAM_ID} from './constants';
import { 
    getMetadata, 
    createMetadataAccount,
    getCreators,
    createMetadataArgsV2,
    createMasterEditionAccount,
    createMasterEditionArgsV3,
    getMasterEdition,
    getEditionMarkPda,
    createMintNewEditionAccount,
    createMintNewEditionArgs } from './instructions';



export type NFTCreation ={
    mint: anchor.web3.PublicKey;
    newMint: anchor.web3.PublicKey;
    tokenAccount: Account;
    newTokenAccount: Account;
    metadata: anchor.web3.PublicKey;
    masterEdition: anchor.web3.PublicKey;
    newMetadata: anchor.web3.PublicKey;
    newMasterEdition: anchor.web3.PublicKey;
    editionMarker: anchor.web3.PublicKey;
}

export const create = async (
    provider: anchor.Provider, 
    wallet: anchor.web3.Keypair, 
    relayer: anchor.web3.PublicKey,
    maxSupply: number,
    ): Promise<NFTCreation>  => {

    const creators = await getCreators([wallet.publicKey, relayer]);

    const mint = await createMint(
        provider.connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
    );

    const new_mint = await createMint(
        provider.connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet,
        mint,
        wallet.publicKey,
    );

    const newTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet,
        new_mint,
        TOKEN_PROGRAM_ID,
    );

    const metadata = await getMetadata(mint)
    const new_metadata = await getMetadata(new_mint)
    const master_edition = await getMasterEdition(mint)
    const new_master_edition = await getMasterEdition(new_mint)
    const edition_marker = await getEditionMarkPda(mint, new anchor.BN(1))

    const accounts = await createMetadataAccount(
        metadata,
        mint,
        wallet.publicKey,
        wallet.publicKey,
        wallet.publicKey
    );

    const master_account = await createMasterEditionAccount(
        master_edition,
        metadata,
        mint,
        wallet.publicKey,
        wallet.publicKey,
        wallet.publicKey
    );

    const data = await createMetadataArgsV2(
        'AA',
        'Collection NFT',
        'QQ',
        500,
        creators 
    );

    const max_supply = maxSupply
    const master_data = await createMasterEditionArgsV3(max_supply);

    const tx_mint =  await mintTo(
        provider.connection,
        wallet,
        mint,
        tokenAccount.address,
        wallet,
        1
    )

    const tx_new_mint = await mintTo(
        provider.connection,
        wallet,
        new_mint,
        newTokenAccount.address,
        wallet,
        1
    )

    const instruction_metadata = await createCreateMetadataAccountV2Instruction(accounts, data)
    const instruction_master_edition = await createCreateMasterEditionV3Instruction(master_account, master_data);

    const tx = new Transaction().add(
        instruction_metadata
        ).add(instruction_master_edition);

    const transactionSignature = await sendAndConfirmTransaction(
        provider.connection,
        tx,
        [wallet],
        {
            commitment: 'singleGossip',
            preflightCommitment: 'singleGossip'
        }
    );
    
    const creationAccounts : NFTCreation = {
        mint: mint,
        newMint: new_mint,
        tokenAccount: tokenAccount,
        newTokenAccount: newTokenAccount,
        metadata: metadata,
        masterEdition: master_edition,
        newMetadata: new_metadata,
        newMasterEdition: new_master_edition,
        editionMarker: edition_marker,
    } 

    return creationAccounts;

}