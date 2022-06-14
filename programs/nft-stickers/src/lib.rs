use anchor_lang::prelude::*;
use solana_program::{
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    msg};
use anchor_spl::token::Token;
use mpl_token_metadata::*;
use spl_token;

declare_id!("3T7Zj9GsgV6Mj1y3kYBKTkzJ3pQCY2FooFztCtVfpK2X");

//const NFT_STICKER_PACK_PDA_SEED: &[u8] = b"nft-sticker-pack";
const RELAYER_SEED: &[u8] = b"relayer";
//pub const PREFIX: &[u8] = b"metadata";
//pub const EDITION: &[u8] = b"edition";
//pub const EDITION_MARKER_BIT_SIZE: u64 = 248;
//const DISCRIMINATOR_LENGTH: usize = 8;
//const STRING_LENGTH_PREFIX: usize = 4;
//const STRING_LENGTH_URI: usize = 128;


#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct Sticker {
    /// Uri of a single sticker
    pub uri: String,
}

#[program]
pub mod nft_stickers {
    use super::*;

    /*pub fn create_sticker_pack(_ctx: Context<CreateStickerPack>) -> Result<()> {
        msg!("Tutto ok per ora");
        Ok(())
    }*/

    pub fn stake_master_edition(ctx: Context<StakeMasterEdition>) -> Result<()> {
        
        let metadata_info = ctx.accounts.metadata.as_ref();
        let metadata = mpl_token_metadata::state::Metadata::from_account_info(metadata_info)?;
        let update_authority = ctx.accounts.update_authority.as_ref();
        let mint_info = ctx.accounts.mint.as_ref();
        let master_edition_info = ctx.accounts.master_edition.as_ref();
        let user_associated_token_account = ctx.accounts.associated_token_account.as_ref();
        let pda_relayer_account = &ctx.accounts.relayer;
        let token_program = ctx.accounts.token_program.as_ref();

        if !update_authority.is_signer || (metadata.update_authority != *update_authority.key) {
            return Err(ProgramError::MissingRequiredSignature.into());
        }
        if metadata.mint != *mint_info.key {
            return Err(error!(ErrorCode::MetadataMismatch));
        }

        let master_edition = &mpl_token_metadata::state::MasterEditionV2::from_account_info(master_edition_info)?;
        if master_edition.key != mpl_token_metadata::state::Key::MasterEditionV2 {
            return Err(error!(ErrorCode::WrongEdition));
        }
        let mut found = false;
        if let Some(creators) = metadata.data.creators {
            for i in 0..creators.len() {
                if creators[i].address == pda_relayer_account.key() {
                    found = true;
                }
            }
            if !found {
                return Err(error!(ErrorCode::SatelliteMustListAmongCreators));
            }
        }

        invoke(
            &spl_token::instruction::set_authority(
                &spl_token::id(),
                &user_associated_token_account.key,
                Some(&pda_relayer_account.key()),
                spl_token::instruction::AuthorityType::AccountOwner,
                &update_authority.key,
                &[],
            )?,
            &[
                user_associated_token_account.clone(),
                pda_relayer_account.to_account_info().clone(),
                update_authority.clone(),
                token_program.clone()
            ],
        )?;
        


        Ok(())
    }

    pub fn unstake_master_edition(ctx: Context<StakeMasterEdition>) -> Result<()> {
        
        let metadata_info = ctx.accounts.metadata.as_ref();
        let metadata = mpl_token_metadata::state::Metadata::from_account_info(metadata_info)?;
        let update_authority = ctx.accounts.update_authority.as_ref();
        let mint_info = ctx.accounts.mint.as_ref();
        let master_edition_info = ctx.accounts.master_edition.as_ref();
        let user_associated_token_account = ctx.accounts.associated_token_account.as_ref();
        let pda_relayer_account = &ctx.accounts.relayer;
        let token_program = ctx.accounts.token_program.as_ref();

        if !update_authority.is_signer || (metadata.update_authority != *update_authority.key) {
            return Err(ProgramError::MissingRequiredSignature.into());
        }
        if metadata.mint != *mint_info.key {
            return Err(error!(ErrorCode::MetadataMismatch));
        }

        let master_edition = &mpl_token_metadata::state::MasterEditionV2::from_account_info(master_edition_info)?;
        if master_edition.key != mpl_token_metadata::state::Key::MasterEditionV2 {
            return Err(error!(ErrorCode::WrongEdition));
        }

        /*if let Some(max_supply) = master_edition.max_supply {
            if master_edition.supply != max_supply {
                return Err(error!(ErrorCode::OngoingSales));
            }
        }*/

        let (pda, bump_seed) = Pubkey::find_program_address(           // Calc PDA address from passed in nft_creater_program_id
            &[RELAYER_SEED], 
            ctx.program_id
        );

        if pda != pda_relayer_account.key() {
            return Err(error!(ErrorCode::OwnerMismatch));
        }

        let signature = &[
            RELAYER_SEED,
            &[bump_seed],
        ];

        invoke_signed(
            &spl_token::instruction::set_authority(
                &spl_token::id(),
                &user_associated_token_account.key,
                Some(update_authority.key),
                spl_token::instruction::AuthorityType::AccountOwner,
                &pda_relayer_account.key(),
                &[],
            )?,
            &[
                user_associated_token_account.clone(),
                update_authority.clone(),
                pda_relayer_account.to_account_info().clone(),
                token_program.clone()
            ],
            &[signature]
        )?;
        


        Ok(())
    }

    pub fn mint_new_edition(ctx: Context<MintNewEdition>, edition: u64) -> Result<()> {

        let new_mint_from_master_edition_account_info = vec![
            ctx.accounts.new_metadata.to_account_info(),
            ctx.accounts.new_edition.to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.new_mint.to_account_info(),
            ctx.accounts.edition_marker.to_account_info(),
            ctx.accounts.new_mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.relayer.to_account_info(),
            ctx.accounts.associated_token_account.to_account_info(),
            ctx.accounts.new_update_authority.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.metadata_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];


        let (pda, bump_seed) = Pubkey::find_program_address(
            &[RELAYER_SEED], 
            ctx.program_id
        );

        if pda != ctx.accounts.relayer.key() {
            return Err(error!(ErrorCode::OwnerMismatch));
        }

        let signature = &[
            RELAYER_SEED,
            &[bump_seed],
        ];

        invoke_signed(
            &mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
                mpl_token_metadata::id(),
                ctx.accounts.new_metadata.key(),
                ctx.accounts.new_edition.key(),
                ctx.accounts.master_edition.key(),
                ctx.accounts.new_mint.key(),
                ctx.accounts.new_mint_authority.key(),
                ctx.accounts.payer.key(),
                ctx.accounts.relayer.key(),
                ctx.accounts.associated_token_account.key(),
                ctx.accounts.new_update_authority.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.mint.key(),
                edition,
            ),
            new_mint_from_master_edition_account_info.as_slice(),
            &[signature]
        )?;
        


        Ok(())
    }


}



/*#[derive(Accounts)]
pub struct CreateStickerPack<'info> {
    #[account(
        init,
        payer = payer,
        space = NFTStickerPack::LEN,
        seeds = [&mint.key().to_bytes()[..32], &metadata.key().to_bytes()[..32], &master_edition.key().to_bytes()[..32], NFT_STICKER_PACK_PDA_SEED],
        bump
    )]
    pub sticker_pack: Account<'info, NFTStickerPack>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    pub mint_authority: Signer<'info>,
    pub update_authority: Signer<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,

}*/

#[derive(Accounts)]
pub struct StakeMasterEdition<'info> {
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub associated_token_account: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = update_authority,
        space = 8,
        seeds = [RELAYER_SEED],
        bump
    )]
    pub relayer: Account<'info, Relayer>,
    #[account(mut)]
    pub update_authority: Signer<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNewEdition<'info> {
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub new_metadata: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub new_edition: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub new_mint: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    #[account(mut)]
    pub edition_marker: UncheckedAccount<'info>,
    pub new_mint_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub relayer: Account<'info, Relayer>,
    /// CHECK: account checked in CPI
    pub associated_token_account: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    pub new_update_authority: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: account checked in CPI
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: account checked in CPI
    pub metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>


}


/*#[account]
pub struct NFTStickerPack {
    pub list_stickers: Option<Vec<Sticker>>
}


impl NFTStickerPack {
    const LEN: usize = DISCRIMINATOR_LENGTH
    + ((STRING_LENGTH_PREFIX + STRING_LENGTH_URI) * 10);

}*/

#[account]
pub struct Relayer {}


#[error_code]
pub enum ErrorCode {
    #[msg("Metadata differs from Mint provided")]
    MetadataMismatch,
    #[msg("Wrong NFT Edition or Master edition already used")]
    WrongEdition,
    #[msg("Satellite must be listed as one of the creators")]
    SatelliteMustListAmongCreators,
    #[msg("Sales not ended for given Master Edition")]
    OngoingSales,
    #[msg("Master edition not owned")]
    NotOwned,
    #[msg("The owner is not a sattelite account")]
    OwnerMismatch,
}