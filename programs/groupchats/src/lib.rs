use anchor_lang::prelude::*;

declare_id!("EGSLBxSQyf8aYgV8gavHy2qhdwdrCRunap6Tv3c7YJWP");

const GROUP_PDA_SEED: &[u8] = b"groupchat";
const INVITE_PDA_SEED: &[u8] = b"invite";
const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_LENGTH: usize = 32; 
const BOOL_LENGTH: usize = 1; 
const STRING_LENGTH_PREFIX: usize = 4;
const STRING_LENGTH_NAME: usize = 64;
const STRING_LENGTH_GROUP_ID: usize = 160;
const U8_LENGTH: usize = 1;
const STRING_LENGTH_ENCRYPTION_KEY: usize = 64;
const DB_TYPE_LENGTH: usize = 1;

#[program]
pub mod groupchats {
    use super::*;

    pub fn create(ctx: Context<Create>, _group_hash: [u8; 32], group_id: String, open_invites: bool, name: String, encryption_key: String, db_type: u8) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let invitation = &mut ctx.accounts.invitation;
        group.creator = ctx.accounts.payer.key();
        group.admin = ctx.accounts.signer.key();
        group.open_invites = open_invites;
        group.members = 1;
        
        length_check(&name, 3, 64, true)?;
        group.name = name;

        invitation.sender = ctx.accounts.payer.key();
        invitation.group_key = group.key();
        invitation.recipient = ctx.accounts.signer.key();

        length_check(&group_id, 1, 160, true)?;
        invitation.group_id = group_id;

        length_check(&encryption_key, 64, 64, true)?;
        invitation.encryption_key = encryption_key;

        invitation.db_type = db_type;

        Ok(())
    }

    pub fn invite(ctx: Context<Invite>, group_id: String, recipient: Pubkey, encryption_key: String, db_type: u8) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let new_invitation = &mut ctx.accounts.new_invitation;
        group.members += 1;
        new_invitation.sender = ctx.accounts.payer.key();
        new_invitation.group_key = group.key();
        new_invitation.recipient = recipient;

        length_check(&group_id, 1, 160, true)?;
        new_invitation.group_id = group_id;

        length_check(&encryption_key, 64, 64, true)?;
        new_invitation.encryption_key = encryption_key;

        new_invitation.db_type = db_type;
        
        Ok(())
    }

    pub fn modify_successor(ctx: Context<ModifySuccessor>) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let successor = &mut ctx.accounts.successor;
        group.admin = successor.recipient;
        Ok(())
    }

    pub fn modify_open_ivites(ctx: Context<ModifyParameter>, open_invites: bool) -> Result<()> {
        let group = &mut ctx.accounts.group;
        group.open_invites = open_invites;
        Ok(())
    }

    pub fn modify_name(ctx: Context<ModifyParameter>, name: String) -> Result<()> {
        let group = &mut ctx.accounts.group;

        length_check(&name, 3, 64, true)?;
        group.name = name;

        Ok(())
    }

    pub fn leave(ctx: Context<Leave>) -> Result<()> {
        let group = &mut ctx.accounts.group;
        group.members -= 1;
        Ok(())
    }

    pub fn admin_leave(ctx: Context<AdminLeave>) -> Result<()> {
        let group = &mut ctx.accounts.group;
        group.members -= 1;
        group.admin = ctx.accounts.successor.recipient;
        Ok(())
    }

    pub fn close(_ctx: Context<Close>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(group_hash: [u8; 32])]
pub struct Create<'info> {
    #[account(
        init,
        payer = payer,
        space = Group::LEN,
        seeds = [&group_hash, GROUP_PDA_SEED],
        bump
    )]
    pub group: Account<'info, Group>,
    #[account(
        init,
        payer = payer,
        space = Invitation::LEN,
        seeds = [&signer.key.to_bytes()[..32], &group.key().to_bytes()[..32], INVITE_PDA_SEED],
        bump
    )]
    pub invitation: Account<'info, Invitation>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(group_id: String, recipient: Pubkey)]
pub struct Invite<'info> {
    #[account(
        init,
        payer = payer,
        space = Invitation::LEN,
        seeds = [&recipient.to_bytes()[..32], &group.key().to_bytes()[..32], INVITE_PDA_SEED],
        bump
    )]
    pub new_invitation: Account<'info, Invitation>,
    #[account(
        mut,
        constraint = (invitation.recipient == signer.key() && group.open_invites) ||
                     signer.key() == group.admin @ ErrorCode::WrongPrivileges
    )]
    pub group: Account<'info, Group>,
    #[account(
        constraint = group.key() == invitation.group_key @ ErrorCode::InvitationMismatch
    )]
    pub invitation: Account<'info, Invitation>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifySuccessor<'info> {
    #[account(
        mut,
        has_one = admin @ ErrorCode::WrongPrivileges
    )]
    pub group: Account<'info, Group>,
    #[account(
        constraint = successor.group_key == group.key() @ ErrorCode::InvitationMismatch
    )]
    pub successor: Account<'info, Invitation>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ModifyParameter<'info> {
    #[account(
        mut,
        has_one = admin @ ErrorCode::WrongPrivileges
    )]
    pub group: Account<'info, Group>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Leave<'info> {
    #[account(
        mut,
        constraint = (signer.key() != group.admin && signer.key() == invitation.recipient) ||
                     (signer.key() == group.admin && signer.key() != invitation.recipient) @ ErrorCode::WrongPrivileges
    )]
    pub group: Account<'info, Group>,
    #[account(
        mut,
        close = invitation_sender, 
        constraint = invitation_sender.key() == invitation.sender @ ErrorCode::PayerMismatch,
        constraint = group.key() == invitation.group_key @ ErrorCode::InvitationMismatch
    )]
    pub invitation: Account<'info, Invitation>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub invitation_sender: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct AdminLeave<'info> {
    #[account(
        mut,
        constraint = signer.key() == group.admin &&
                     signer.key() == invitation.recipient @ ErrorCode::WrongPrivileges
    )]
    pub group: Account<'info, Group>,
    #[account(
        mut,
        close = invitation_sender, 
        constraint = invitation_sender.key() == invitation.sender @ ErrorCode::PayerMismatch,
        constraint = group.key() == invitation.group_key @ ErrorCode::InvitationMismatch
    )]
    pub invitation: Account<'info, Invitation>,
    #[account(
        constraint = successor.group_key == group.key() &&
                     successor.recipient != invitation.recipient @ ErrorCode::InvitationMismatch
    )]
    pub successor: Account<'info, Invitation>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub invitation_sender: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        close = creator, 
        constraint = signer.key() == group.admin @ ErrorCode::WrongPrivileges,
        constraint = group.members == 1 @ ErrorCode::NotEmpty,
        constraint = group.creator == creator.key() @ ErrorCode::PayerMismatch
    )]
    pub group: Account<'info, Group>,
    #[account(
        mut,
        close = invitation_sender, 
        constraint = invitation_sender.key() == invitation.sender @ ErrorCode::PayerMismatch,
        constraint = group.key() == invitation.group_key @ ErrorCode::InvitationMismatch
    )]
    pub invitation: Account<'info, Invitation>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub creator: SystemAccount<'info>,
    #[account(mut)]
    pub invitation_sender: SystemAccount<'info>,
}

#[account]
pub struct Group {
    pub creator: Pubkey,
    pub admin: Pubkey,
    pub open_invites: bool,
    pub members: u8,
    pub name: String,
}

impl Group {
    const LEN: usize = DISCRIMINATOR_LENGTH
    + PUBKEY_LENGTH
    + PUBKEY_LENGTH
    + BOOL_LENGTH
    + U8_LENGTH
    + STRING_LENGTH_PREFIX + STRING_LENGTH_NAME;
}

#[account]
pub struct Invitation {
    pub sender: Pubkey,
    pub group_key: Pubkey,
    pub recipient: Pubkey,
    pub group_id: String,
    pub encryption_key: String,
    pub db_type: u8,
}

impl Invitation {
    const LEN: usize = DISCRIMINATOR_LENGTH
    + PUBKEY_LENGTH
    + PUBKEY_LENGTH
    + PUBKEY_LENGTH
    + STRING_LENGTH_PREFIX +STRING_LENGTH_GROUP_ID
    + STRING_LENGTH_PREFIX + STRING_LENGTH_ENCRYPTION_KEY
    + DB_TYPE_LENGTH;
}

#[error_code]
pub enum ErrorCode {
    #[msg("User cannot perform this action")]
    WrongPrivileges,
    #[msg("Invite does not match Group ID")]
    InvitationMismatch,
    #[msg("Account was not created by provided user")]
    PayerMismatch,
    #[msg("Group not empty")]
    NotEmpty,
    #[msg("The field is too short or too long")]
    IncorrectField,
    #[msg("Parameters order mismatch")]
    InputError,
}

fn length_check(field: &String, min_accepted_length: usize, max_accepted_length: usize, is_mandatory: bool) -> Result<()> {

    if is_mandatory && field.chars().count() == 0 {
        return Err(error!(ErrorCode::IncorrectField))
    }

    if min_accepted_length > max_accepted_length {
        return Err(error!(ErrorCode::InputError))
    } 
    
    if (field.chars().count() >= min_accepted_length && field.chars().count() <= max_accepted_length) || (field.chars().count() == 0) {
        Ok(())
    }
    else {
        Err(error!(ErrorCode::IncorrectField))
    }  
    
}
