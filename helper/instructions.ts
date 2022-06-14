import * as anchor from '@project-serum/anchor';
import { TOKEN_METADATA_PROGRAM_ID } from './constants';
import {
    createCreateMetadataAccountV2Instruction,
    CreateMetadataAccountV2InstructionArgs,
    CreateMetadataAccountArgsV2,
    CreateMasterEditionArgs,
    CreateMasterEditionV3InstructionArgs,
    CreateMetadataAccountV2InstructionAccounts,
    createCreateMasterEditionV3Instruction,
    CreateMasterEditionV3InstructionAccounts,
    MintNewEditionFromMasterEditionViaTokenArgs,
    MintNewEditionFromMasterEditionViaTokenInstructionArgs,
    MintNewEditionFromMasterEditionViaTokenInstructionAccounts,
    Creator,
    DataV2,
    Collection,
    Uses,
    Data,
    UseAuthorityRecord,
  } from '@metaplex-foundation/mpl-token-metadata';

export const getMetadata = async (
    mint: anchor.web3.PublicKey,
  ): Promise<anchor.web3.PublicKey> => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID,
      )
    )[0];
  };

export const getMasterEdition = async (
    mint: anchor.web3.PublicKey,
  ): Promise<anchor.web3.PublicKey> => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID,
      )
    )[0];
  };

export async function getEditionMarkPda(
    mint: anchor.web3.PublicKey,
    edition: anchor.BN,
  ): Promise<anchor.web3.PublicKey> {
    const editionNumber = Math.floor(edition.toNumber() / 248);
  
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
          Buffer.from(editionNumber.toString()),
        ],
        new anchor.web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      )
    )[0];
}

export const createMetadataAccount = async (
    metadata: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    mintAuthority: anchor.web3.PublicKey,
    payer: anchor.web3.PublicKey,
    updateAuthority: anchor.web3.PublicKey,
): Promise<CreateMetadataAccountV2InstructionAccounts> => {

    const accounts : CreateMetadataAccountV2InstructionAccounts = {
        metadata: metadata,
        mint: mint,
        mintAuthority: mintAuthority,
        payer: payer,
        updateAuthority: updateAuthority
    }

    return accounts;

};

export const getCreators = async (
    creators_keys: Array<anchor.web3.PublicKey>,
    
): Promise<Array<Creator>> => {

    var creators = new Array<Creator>();

    const share = 100 / creators_keys.length

    creators_keys.forEach(creator => {

        const creator_data : Creator = {
            address: creator,
            verified: false,
            share: share,
        };
        creators.push(creator_data)


    })


    return creators;

};


export const createMetadataArgsV2 = async (
    symbol: string,
    name: string,
    uri: string,
    sellerFeeBasisPoints: number,
    creators: Creator[],
    collection?: Collection,
    uses?: Uses,
    isMutable?: boolean,
): Promise<CreateMetadataAccountV2InstructionArgs> => {

    const data : DataV2 = {
        symbol: symbol,
        name: name,
        uri: uri,
        sellerFeeBasisPoints: sellerFeeBasisPoints,
        creators: creators,
        collection: collection ?? null,
        uses: uses ?? null,
      };
    
    const metadataArgsV2 : CreateMetadataAccountArgsV2 = {
        data: data,
        isMutable: isMutable ?? true,
    }
    
    const dataArgs : CreateMetadataAccountV2InstructionArgs = {
        createMetadataAccountArgsV2: metadataArgsV2
    }


    return dataArgs;

}

export const createMasterEditionAccount = async (
    edition: anchor.web3.PublicKey,
    metadata: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    mintAuthority: anchor.web3.PublicKey,
    payer: anchor.web3.PublicKey,
    updateAuthority: anchor.web3.PublicKey,
): Promise<CreateMasterEditionV3InstructionAccounts> => {

    const accounts : CreateMasterEditionV3InstructionAccounts = {
        edition: edition,
        metadata: metadata,
        mint: mint,
        mintAuthority: mintAuthority,
        payer: payer,
        updateAuthority: updateAuthority
    }

    return accounts;

};


export const createMasterEditionArgsV3 = async (
    maxSupply?: number
): Promise<CreateMasterEditionV3InstructionArgs> => {

    
    const masterEditionArgs : CreateMasterEditionArgs = {
        maxSupply: new anchor.BN(maxSupply) ?? new anchor.BN(1)
    }
    
    const dataArgs : CreateMasterEditionV3InstructionArgs = {
        createMasterEditionArgs: masterEditionArgs
    }


    return dataArgs;

}


export const createMintNewEditionArgs = async (
  edition: number
): Promise<MintNewEditionFromMasterEditionViaTokenInstructionArgs> => {

  
  const mintNewEditionArgs : MintNewEditionFromMasterEditionViaTokenArgs = {
      edition: new anchor.BN(edition)
  }
  
  const dataArgs : MintNewEditionFromMasterEditionViaTokenInstructionArgs = {
      mintNewEditionFromMasterEditionViaTokenArgs: mintNewEditionArgs
  }


  return dataArgs;

}

export const createMintNewEditionAccount = async (
      newMetadata: anchor.web3.PublicKey,
      newEdition: anchor.web3.PublicKey,
      masterEdition: anchor.web3.PublicKey,
      newMint: anchor.web3.PublicKey,
      editionMarkPda: anchor.web3.PublicKey,
      newMintAuthority: anchor.web3.PublicKey,
      payer: anchor.web3.PublicKey,
      tokenAccountOwner: anchor.web3.PublicKey,
      tokenAccount: anchor.web3.PublicKey,
      newMetadataUpdateAuthority: anchor.web3.PublicKey,
      metadata: anchor.web3.PublicKey
): Promise<MintNewEditionFromMasterEditionViaTokenInstructionAccounts> => {

  const accounts : MintNewEditionFromMasterEditionViaTokenInstructionAccounts = {
      newMetadata: newMetadata,
      newEdition: newEdition,
      masterEdition: masterEdition,
      newMint: newMint,
      editionMarkPda: editionMarkPda,
      newMintAuthority: newMintAuthority,
      payer: payer,
      tokenAccountOwner: tokenAccountOwner,
      tokenAccount: tokenAccount,
      newMetadataUpdateAuthority: newMetadataUpdateAuthority,
      metadata: metadata
  }

  return accounts;

};