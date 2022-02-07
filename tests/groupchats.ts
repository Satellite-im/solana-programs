import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { Groupchats } from '../target/types/groupchats'
import assert from 'assert'
const { SystemProgram } = anchor.web3

describe('groupchats', () => {
  const provider = anchor.Provider.env()

  // Configure the client to use the local cluster.
  anchor.setProvider(provider)

  // Program for the tests.
  const program = anchor.workspace.Groupchats as Program<Groupchats>

  const groupSeed = Buffer.from(anchor.utils.bytes.utf8.encode('groupchat'))
  const inviteSeed = Buffer.from(anchor.utils.bytes.utf8.encode('invite'))

  const textileKey =
    'dhfskjdfhsdjkfhsdjkfhdsjkhdjkfdhfskjdfhsdjkfhsdjkfhdsjkhdjkfdfrt'
  const threadHash = Buffer.from(
    anchor.utils.bytes.utf8.encode('dhfskjdfhsdjkfhsdjkfhdsjkhdjkfds'),
  )

  // Accounts for the tests.
  const group = anchor.utils.publicKey.findProgramAddressSync(
    [threadHash, groupSeed],
    program.programId,
  )
  const user1 = anchor.web3.Keypair.generate()
  const inv1 = anchor.utils.publicKey.findProgramAddressSync(
    [user1.publicKey.toBytes(), group[0].toBytes(), inviteSeed],
    program.programId,
  )
  const user2 = anchor.web3.Keypair.generate()
  const inv2 = anchor.utils.publicKey.findProgramAddressSync(
    [user2.publicKey.toBytes(), group[0].toBytes(), inviteSeed],
    program.programId,
  )
  const user3 = anchor.web3.Keypair.generate()
  const inv3 = anchor.utils.publicKey.findProgramAddressSync(
    [user3.publicKey.toBytes(), group[0].toBytes(), inviteSeed],
    program.programId,
  )
  const user4 = anchor.web3.Keypair.generate()
  const inv4 = anchor.utils.publicKey.findProgramAddressSync(
    [user4.publicKey.toBytes(), group[0].toBytes(), inviteSeed],
    program.programId,
  )

  it('Creates a new group', async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
      'confirmed',
    )
    await program.rpc.create(threadHash, textileKey, true, {
      accounts: {
        group: group[0],
        invitation: inv1[0],
        user: user1.publicKey,
        payer: user1.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user1],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    let invitationAccount = await program.account.invitation.fetch(inv1[0])

    assert.ok(groupAccount.creator.equals(user1.publicKey))
    assert.ok(invitationAccount.sender.equals(user1.publicKey))
  })

  it('Admin invites new user', async () => {
    await program.rpc.invite(textileKey, user2.publicKey, {
      accounts: {
        newInvitation: inv2[0],
        group: group[0],
        invitation: inv1[0],
        user: user1.publicKey,
        payer: user1.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user1],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    let invitation2Account = await program.account.invitation.fetch(inv2[0])

    assert.ok(groupAccount.members == 2)
    assert.ok(invitation2Account.recipient.equals(user2.publicKey))
  })

  it('User invites new user', async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 10000000000),
      'confirmed',
    )

    await program.rpc.invite(textileKey, user3.publicKey, {
      accounts: {
        newInvitation: inv3[0],
        group: group[0],
        invitation: inv2[0],
        user: user2.publicKey,
        payer: user2.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user2],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    let invitation2Account = await program.account.invitation.fetch(inv3[0])

    assert.ok(groupAccount.members == 3)
    assert.ok(invitation2Account.recipient.equals(user3.publicKey))
  })

  it('Admin modifies group settings', async () => {
    await program.rpc.modify(false, {
      accounts: {
        group: group[0],
        successor: inv1[0],
        admin: user1.publicKey,
      },
      signers: [user1],
    })

    let groupAccount = await program.account.group.fetch(group[0])

    assert.ok(groupAccount.members == 3)
    assert.ok(!groupAccount.openInvites)
    assert.ok(groupAccount.admin.equals(user1.publicKey))
  })

  it('User now cannot invite new user', async () => {
    try {
      await program.rpc.invite(textileKey, user4.publicKey, {
        accounts: {
          newInvitation: inv4[0],
          group: group[0],
          invitation: inv2[0],
          user: user2.publicKey,
          payer: user2.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [user2],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'User cannot perform this action'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 3)
  })

  it('User cannot modify group settings', async () => {
    try {
      await program.rpc.modify(true, {
        accounts: {
          group: group[0],
          successor: inv2[0],
          admin: user2.publicKey,
        },
        signers: [user2],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'User cannot perform this action'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(!groupAccount.openInvites)
    assert.ok(groupAccount.admin.equals(user1.publicKey))
  })

  it('User cannot leave group using admin call', async () => {
    try {
      const tx = await program.rpc.adminLeave({
        accounts: {
          group: group[0],
          invitation: inv2[0],
          successor: inv1[0],
          user: user2.publicKey,
          invitationSender: user1.publicKey,
        },
        signers: [user2],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'User cannot perform this action'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])

    assert.ok(groupAccount.members == 3)
  })

  it('User cannot leave group giving wrong invitation sender', async () => {
    try {
      await program.rpc.leave({
        accounts: {
          group: group[0],
          invitation: inv2[0],
          user: user2.publicKey,
          invitationSender: user2.publicKey,
        },
        signers: [user2],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'Account was not created by provided user'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])

    assert.ok(groupAccount.members == 3)
  })

  it('User leaves group', async () => {
    await program.rpc.leave({
      accounts: {
        group: group[0],
        invitation: inv2[0],
        user: user2.publicKey,
        invitationSender: user1.publicKey,
      },
      signers: [user2],
    })

    let groupAccount = await program.account.group.fetch(group[0])

    assert.ok(groupAccount.members == 2)
  })

  it('Admin invites old user back', async () => {
    await program.rpc.invite(textileKey, user2.publicKey, {
      accounts: {
        newInvitation: inv2[0],
        group: group[0],
        invitation: inv1[0],
        user: user1.publicKey,
        payer: user1.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user1],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    let invitation2Account = await program.account.invitation.fetch(inv2[0])

    assert.ok(groupAccount.members == 3)
    assert.ok(invitation2Account.recipient.equals(user2.publicKey))
  })

  it('Admin cannot leave group with normal function', async () => {
    try {
      const tx = await program.rpc.leave({
        accounts: {
          group: group[0],
          invitation: inv1[0],
          user: user1.publicKey,
          invitationSender: user1.publicKey,
        },
        signers: [user1],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'User cannot perform this action'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 3)
  })

  it('Admin cannot leave group with dedicated function giving wrong invitation sender', async () => {
    try {
      const tx = await program.rpc.adminLeave({
        accounts: {
          group: group[0],
          invitation: inv1[0],
          successor: inv2[0],
          user: user1.publicKey,
          invitationSender: user2.publicKey,
        },
        signers: [user1],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'Account was not created by provided user'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 3)
    assert.ok(groupAccount.admin.equals(user1.publicKey))
  })

  it('Admin leaves group with dedicated function', async () => {
    const tx = await program.rpc.adminLeave({
      accounts: {
        group: group[0],
        invitation: inv1[0],
        successor: inv2[0],
        user: user1.publicKey,
        invitationSender: user1.publicKey,
      },
      signers: [user1],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 2)
    assert.ok(groupAccount.admin.equals(user2.publicKey))
  })

  it('New Admin modifies group settings, changing admin', async () => {
    await program.rpc.modify(true, {
      accounts: {
        group: group[0],
        successor: inv3[0],
        admin: user2.publicKey,
      },
      signers: [user2],
    })

    let groupAccount = await program.account.group.fetch(group[0])

    assert.ok(groupAccount.members == 2)
    assert.ok(groupAccount.openInvites)
    assert.ok(groupAccount.admin.equals(user3.publicKey))
  })

  it('New Admin cannot close group if he is not the only one inside', async () => {
    try {
      const tx = await program.rpc.close({
        accounts: {
          group: group[0],
          invitation: inv3[0],
          user: user3.publicKey,
          creator: user1.publicKey,
          invitationSender: user2.publicKey,
        },
        signers: [user3],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'Group not empty'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 2)
  })

  it('Old Admin cannot close group', async () => {
    try {
      const tx = await program.rpc.close({
        accounts: {
          group: group[0],
          invitation: inv2[0],
          user: user2.publicKey,
          creator: user1.publicKey,
          invitationSender: user1.publicKey,
        },
        signers: [user2],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'User cannot perform this action'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 2)
  })

  it('New Admin kicks old admin', async () => {
    await program.rpc.leave({
      accounts: {
        group: group[0],
        invitation: inv2[0],
        user: user3.publicKey,
        invitationSender: user1.publicKey,
      },
      signers: [user3],
    })

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 1)
  })

  it('Admin cannot close group giving wrong creator address', async () => {
    try {
      const tx = await program.rpc.close({
        accounts: {
          group: group[0],
          invitation: inv3[0],
          user: user3.publicKey,
          creator: user2.publicKey,
          invitationSender: user2.publicKey,
        },
        signers: [user3],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'Account was not created by provided user'
      assert.equal(err.toString(), errMsg)
    }

    let groupAccount = await program.account.group.fetch(group[0])
    assert.ok(groupAccount.members == 1)
  })

  it('Admin closes group', async () => {
    const tx = await program.rpc.close({
      accounts: {
        group: group[0],
        invitation: inv3[0],
        user: user3.publicKey,
        creator: user1.publicKey,
        invitationSender: user2.publicKey,
      },
      signers: [user3],
    })

    assert.ok(true)
  })
})
