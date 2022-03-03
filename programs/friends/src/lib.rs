use anchor_lang::prelude::*;

declare_id!("GjS6t1gK9nktqDJBTjobm9Fdepxg2FGb4vifRDEQ8hXL");

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_FROM_LENGTH: usize = 32; 
const STATUS_LENGTH: usize = 1; 
const PUBKEY_TO_LENGTH: usize = 32;
const PUBKEY_PAYER_LENGTH: usize = 32;
const STRING_LENGTH_PREFIX: usize = 4;
const STRING_LENGTH_FROM_ENCRYPTED_KEY: usize = 128;
const STRING_LENGTH_TO_ENCRYPTED_KEY: usize = 128;


#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub enum Status {
    Uninitialized,
    Pending,
    Accepted,
    Denied,
    Removed
}

#[program]
pub mod friends {
    use super::*;

    pub fn make_request(ctx: Context<MakeRequest>, user1: Pubkey, user2: Pubkey, k: String) -> ProgramResult {
        let user = ctx.accounts.user.key();
        let request = &mut ctx.accounts.request;
        if request.status == Status::Uninitialized {
            request.payer = ctx.accounts.payer.key();
        }
        if user == user1 {
            request.from = user1;
            request.to = user2;
        } else {
            request.from = user2;
            request.to = user1;
        }
        request.from_encrypted_key = k;
        request.to_encrypted_key = "".to_string();
        request.status = Status::Pending;
        Ok(())
    }

    pub fn accept_request(ctx: Context<AcceptRequest>, k: String) -> ProgramResult {
        let request = &mut ctx.accounts.request;
        request.to_encrypted_key = k;
        request.status = Status::Accepted;
        Ok(())
    }

    pub fn deny_request(ctx: Context<DenyRequest>) -> ProgramResult {
        let request = &mut ctx.accounts.request;
        request.status = Status::Denied;
        request.from_encrypted_key = "".to_string();
        request.to_encrypted_key = "".to_string();
        Ok(())
    }

    pub fn remove_request(_ctx: Context<RemoveRequest>) -> ProgramResult {
        Ok(())
    }

    pub fn remove_friend(ctx: Context<RemoveFriend>) -> ProgramResult {
        let request = &mut ctx.accounts.request;
        request.status = Status::Removed;
        request.from_encrypted_key = "".to_string();
        request.to_encrypted_key = "".to_string();
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(user1: Pubkey, user2: Pubkey)]
pub struct MakeRequest<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = FriendRequest::LEN,
        seeds = [&user1.to_bytes()[..32], &user2.to_bytes()[..32]],
        bump
    )]
    pub request: Account<'info, FriendRequest>,
    #[account(
        constraint = user1.to_bytes() > user2.to_bytes() @ ErrorCode::OrderMismatch,
        constraint = user1 == user.key() ||
                     user2 == user.key() @ ErrorCode::WrongPrivileges,
        constraint = request.status != Status::Accepted &&
                     request.status != Status::Pending @ ErrorCode::ExistentRequest
    )]
    pub user: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptRequest<'info> {
    #[account(
        mut,
        constraint = user.key() == request.to @ ErrorCode::WrongPrivileges,
        constraint = request.status == Status::Pending @ ErrorCode::NotPendingRequest
    )]
    pub request: Account<'info, FriendRequest>,
    pub user: Signer<'info>
}

#[derive(Accounts)]
pub struct DenyRequest<'info> {
    #[account(
        mut,
        constraint = user.key() == request.to @ ErrorCode::WrongPrivileges,
        constraint = request.status == Status::Pending @ ErrorCode::NotPendingRequest
    )]
    pub request: Account<'info, FriendRequest>,
    pub user: Signer<'info>
}

#[derive(Accounts)]
pub struct RemoveRequest<'info> {
    #[account(
        mut,
        close = payer,
        constraint = user.key() == request.from @ ErrorCode::WrongPrivileges,
        constraint = request.status != Status::Accepted @ ErrorCode::AlreadyFriends,
        constraint = request.payer == payer.key() @ ErrorCode::PayerMismatch,
    )]
    pub request: Account<'info, FriendRequest>,
    pub user: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>
}

#[derive(Accounts)]
pub struct RemoveFriend<'info> {
    #[account(
        mut,
        constraint = user.key() == request.from ||
                     user.key() == request.to @ ErrorCode::WrongRequestData,
        constraint = request.status == Status::Accepted @ ErrorCode::NotFriends
    )]
    pub request: Account<'info, FriendRequest>,
    pub user: Signer<'info>
}

#[account]
pub struct FriendRequest {
    pub from: Pubkey,
    pub status: Status,
    pub to: Pubkey,
    pub payer: Pubkey,
    pub from_encrypted_key: String,
    pub to_encrypted_key: String,
}

impl FriendRequest {
    const LEN: usize = DISCRIMINATOR_LENGTH
    + PUBKEY_FROM_LENGTH
    + STATUS_LENGTH
    + PUBKEY_TO_LENGTH
    + PUBKEY_PAYER_LENGTH
    + STRING_LENGTH_PREFIX + STRING_LENGTH_FROM_ENCRYPTED_KEY
    + STRING_LENGTH_PREFIX + STRING_LENGTH_TO_ENCRYPTED_KEY;
}

#[error]
pub enum ErrorCode {
    #[msg("Addresses in request don't match user address")]
    WrongRequestData,
    #[msg("Request is not pending")]
    NotPendingRequest,
    #[msg("Accounts are not friends yet")]
    NotFriends,
    #[msg("User can't perform this action")]
    WrongPrivileges,
    #[msg("User1 and user2 needs to be passed in order")]
    OrderMismatch,
    #[msg("Users are already friends")]
    AlreadyFriends,
    #[msg("Request already existent")]
    ExistentRequest,
    #[msg("Account was not created by provided user")]
    PayerMismatch,
}