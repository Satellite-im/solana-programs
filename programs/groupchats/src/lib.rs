use anchor_lang::prelude::*;

declare_id!("bJhvwTYCkQceANgeShZ4xaxUqEBPsV8e1NgRnLRymxs");

const GROUP_PDA_SEED: &[u8] = b"groupchat";
const INVITE_PDA_SEED: &[u8] = b"invite";

#[program]
pub mod groupchats {
    use super::*;

    pub fn create(ctx: Context<Create>, _group_hash: String, group_id: String, open_invites: bool) -> ProgramResult {
        let group = &mut ctx.accounts.group;
        let invitation = &mut ctx.accounts.invitation;
        group.creator = ctx.accounts.payer.key();
        group.admin = ctx.accounts.signer.key();
        group.open_invites = open_invites;
        group.members = 1;
        invitation.sender = ctx.accounts.payer.key();
        invitation.group_key = group.key();
        invitation.recipient = ctx.accounts.signer.key();
        invitation.group_id = group_id;
        Ok(())
    }

    pub fn invite(ctx: Context<Invite>, group_id: String, recipient: Pubkey) -> ProgramResult {
        let group = &mut ctx.accounts.group;
        let new_invitation = &mut ctx.accounts.new_invitation;
        group.members += 1;
        new_invitation.sender = ctx.accounts.payer.key();
        new_invitation.group_key = group.key();
        new_invitation.recipient = recipient;
        new_invitation.group_id = group_id;
        Ok(())
    }

    pub fn modify(ctx: Context<Modify>, open_invites: bool) -> ProgramResult {
        let group = &mut ctx.accounts.group;
        let successor = &mut ctx.accounts.successor;
        group.admin = successor.recipient;
        group.open_invites = open_invites;
        Ok(())
    }

    pub fn leave(ctx: Context<Leave>) -> ProgramResult {
        let group = &mut ctx.accounts.group;
        group.members -= 1;
        Ok(())
    }

    pub fn admin_leave(ctx: Context<AdminLeave>) -> ProgramResult {
        let group = &mut ctx.accounts.group;
        group.members -= 1;
        group.admin = ctx.accounts.successor.recipient;
        Ok(())
    }

    pub fn close(_ctx: Context<Close>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(group_hash: String)]
pub struct Create<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [&group_hash.as_bytes()[..32], GROUP_PDA_SEED],
        bump
    )]
    pub group: Account<'info, Group>,
    #[account(
        init,
        payer = payer,
        space = 8+32+32+32+4+64,
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
#[instruction(thread_id: String, recipient: Pubkey)]
pub struct Invite<'info> {
    #[account(
        init,
        payer = payer,
        space = 8+32+32+32+4+64,
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
pub struct Modify<'info> {
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
#[derive(Default)]
pub struct Group {
    pub creator: Pubkey,
    pub admin: Pubkey,
    pub open_invites: bool,
    pub members: u8,
}

#[account]
pub struct Invitation {
    pub sender: Pubkey,
    pub group_key: Pubkey,
    pub recipient: Pubkey,
    pub group_id: String,
}

#[error]
pub enum ErrorCode {
    #[msg("User cannot perform this action")]
    WrongPrivileges,
    #[msg("Invite does not match Group ID")]
    InvitationMismatch,
    #[msg("Account was not created by provided user")]
    PayerMismatch,
    #[msg("Group not empty")]
    NotEmpty,
}