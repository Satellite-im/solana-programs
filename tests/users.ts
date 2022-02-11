import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { Users } from '../target/types/users'
import assert from 'assert'
const { SystemProgram } = anchor.web3

describe('users', () => {
  const provider = anchor.Provider.env()

  // Configure the client to use the local cluster.
  anchor.setProvider(provider)

  // Program for the tests.
  const program = anchor.workspace.Users as Program<Users>

  const userSeed = Buffer.from(anchor.utils.bytes.utf8.encode('user'))
  let name = 'Matt'
  let photoHash =
    'a4bd99e1e0aba51814e81388badb23ecc560312c4324b2018ea76393ea1caca9'
  let status =
    "A long and passionate description which reflects user's personality"

  // Accounts for the tests.
  const user = anchor.web3.Keypair.generate()
  const impostor = anchor.web3.Keypair.generate()
  const userAccount = anchor.utils.publicKey.findProgramAddressSync(
    [user.publicKey.toBytes(), userSeed],
    program.programId,
  )

  it('Creates a new user account', async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 10000000000),
      'confirmed',
    )
    await program.rpc.create(name, photoHash, status, {
      accounts: {
        user: userAccount[0],
        signer: user.publicKey,
        payer: user.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user],
    })

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
  })

  it("Impostor cannot modify another user's name", async () => {
    const newName = 'Jhon'
    try {
      await program.rpc.setName(newName, {
        accounts: {
          user: userAccount[0],
          signer: impostor.publicKey,
          payer: impostor.publicKey,
        },
        signers: [impostor],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'A seeds constraint was violated'
      assert.equal(err.toString(), errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
  })

  it("Impostor cannot modify another user's photo", async () => {
    const newPhotoHash =
      'c73d08de890479518ed60cf670d17faa26a4a71f995c1dcc978165399401a6c4'
    try {
      await program.rpc.setPhotoHash(newPhotoHash, {
        accounts: {
          user: userAccount[0],
          signer: impostor.publicKey,
          payer: impostor.publicKey,
        },
        signers: [impostor],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'A seeds constraint was violated'
      assert.equal(err.toString(), errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
  })

  it("Impostor cannot modify another user's name", async () => {
    const newStatus =
      "A long and passionate description which reflects user's personality, but different than the old one"
    try {
      await program.rpc.setStatus(newStatus, {
        accounts: {
          user: userAccount[0],
          signer: impostor.publicKey,
          payer: impostor.publicKey,
        },
        signers: [impostor],
      })
      assert.ok(false)
    } catch (err) {
      const errMsg = 'A seeds constraint was violated'
      assert.equal(err.toString(), errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
  })

  it('User modifies name', async () => {
    const newName = 'Matthew'
    await program.rpc.setName(newName, {
      accounts: {
        user: userAccount[0],
        signer: user.publicKey,
        payer: user.publicKey,
      },
      signers: [user],
    })

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == newName)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)

    name = newName
  })

  it('User modifies photo', async () => {
    const newPhotoHash =
      'c73d08de890479518ed60cf670d17faa26a4a71f995c1dcc978165399401a6c4'
    await program.rpc.setPhotoHash(newPhotoHash, {
      accounts: {
        user: userAccount[0],
        signer: user.publicKey,
        payer: user.publicKey,
      },
      signers: [user],
    })

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == newPhotoHash)
    assert.ok(userAccountAfter.status == status)

    photoHash = newPhotoHash
  })

  it('User modifies status', async () => {
    const newStatus =
      "A long and passionate description which reflects user's personality, but different than the old one"
    await program.rpc.setStatus(newStatus, {
      accounts: {
        user: userAccount[0],
        signer: user.publicKey,
        payer: user.publicKey,
      },
      signers: [user],
    })

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == newStatus)

    status = newStatus
  })
})
