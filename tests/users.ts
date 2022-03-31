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
  let bannerImageHash = ''
  let extra1 = ''
  let extra2 = ''

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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it("Impostor cannot modify another user's banner image hash", async () => {
    const newBannerImageHash =
      'b5bd22e1e0afg51934e81388asdf23ecc560456r4324b2018ea76393ea1yury5'
    try {
      await program.rpc.setBannerImageHash(newBannerImageHash, {
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it("Impostor cannot modify another user's extra 1", async () => {
    const newExtra1 = 'New data for extra 1 field'
    try {
      await program.rpc.setExtraOne(newExtra1, {
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it("Impostor cannot modify another user's extra 2", async () => {
    const newExtra2 = 'New data for extra 2 field'
    try {
      await program.rpc.setExtraTwo(newExtra2, {
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    name = newName
  })

  it('User cannot modify name with a word greater than 32 characters', async () => {
    const newName = 'Matthew'.repeat(10)
    try {
      await program.rpc.setName(newName, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])
    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify name with a word less than 3 characters', async () => {
    const newName = 'Ma'
    try {
      await program.rpc.setName(newName, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])
    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify name with an empty string', async () => {
    const newName = ''
    try {
      await program.rpc.setName(newName, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])
    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    photoHash = newPhotoHash
  })

  it('User cannot modify photo with an incorrect hash (too long)', async () => {
    const newPhotoHash =
      'c73d08de890479518ed60cf670d17faa26a4a71f995c1dcc978165399401a6c4'.repeat(
        2,
      )
    try {
      await program.rpc.setPhotoHash(newPhotoHash, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify photo with an incorrect hash (too short)', async () => {
    const newPhotoHash = 'c73d08de890479518ed60cf670d17faa26a4a71f995c1dcc9781'
    try {
      await program.rpc.setPhotoHash(newPhotoHash, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify photo with an empty hash', async () => {
    const newPhotoHash = ''
    try {
      await program.rpc.setPhotoHash(newPhotoHash, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
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
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    status = newStatus
  })

  it('User cannot modify status with a phrase greater then 128 characters', async () => {
    const newStatus =
      "A long and passionate description which reflects user's personality, but different than the old one".repeat(
        5,
      )
    try {
      await program.rpc.setStatus(newStatus, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify status with a phrase less then 3 characters', async () => {
    const newStatus = 'At'
    try {
      await program.rpc.setStatus(newStatus, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User modifies banner image hash', async () => {
    const newBannerImageHash =
      'b5bd22e1e0afg51934e81388asdf23ecc560456r4324b2018ea76393ea1yury5'
    await program.rpc.setBannerImageHash(newBannerImageHash, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == newBannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    bannerImageHash = newBannerImageHash
  })

  it('User cannot modify banner image hash with an incorrect hash (too long)', async () => {
    const newBannerImageHash =
      'b5bd22e1e0afg51934e81388asdf23ecc560456r4324b2018ea76393ea1yury5'.repeat(
        2,
      )
    try {
      await program.rpc.setBannerImageHash(newBannerImageHash, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User cannot modify banner image hash with an incorrect hash (too short)', async () => {
    const newBannerImageHash = 'b5bd22e1e0afg51934e81388asdf23ecc5604'
    try {
      await program.rpc.setBannerImageHash(newBannerImageHash, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User modifies banner image hash with an empty hash', async () => {
    const newBannerImageHash = ''

    await program.rpc.setBannerImageHash(newBannerImageHash, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == newBannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    bannerImageHash = newBannerImageHash
  })

  it('User modifies extra 1', async () => {
    const newExtra1 = 'New data for extra 1 field'
    await program.rpc.setExtraOne(newExtra1, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == newExtra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    extra1 = newExtra1
  })

  it('User cannot modify extra 1 with a phrase greater then 64 characters', async () => {
    const newExtra1 = 'New data for extra 1 field'.repeat(10)
    try {
      await program.rpc.setExtraOne(newExtra1, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User modifies extra 1 with empty string', async () => {
    const newExtra1 = ''

    await program.rpc.setExtraOne(newExtra1, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == newExtra1)
    assert.ok(userAccountAfter.extra2 == extra2)

    extra1 = newExtra1
  })

  it('User modifies extra 2', async () => {
    const newExtra2 = 'New data for extra 2 field'
    await program.rpc.setExtraTwo(newExtra2, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == newExtra2)

    extra2 = newExtra2
  })

  it('User cannot modify extra 2 with a phrase greater then 64 characters', async () => {
    const newExtra2 = 'New data for extra 2 field'.repeat(10)
    try {
      await program.rpc.setExtraTwo(newExtra2, {
        accounts: {
          user: userAccount[0],
          signer: user.publicKey,
          payer: user.publicKey,
        },
        signers: [user],
      })
    } catch (error) {
      const errMsg = 'The field is too short or too long'
      assert.equal(error.msg, errMsg)
    }

    let userAccountAfter = await program.account.user.fetch(userAccount[0])

    assert.ok(userAccountAfter.name == name)
    assert.ok(userAccountAfter.photoHash == photoHash)
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == extra2)
  })

  it('User modifies extra 2 with an empty string', async () => {
    const newExtra2 = ''

    await program.rpc.setExtraTwo(newExtra2, {
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
    assert.ok(userAccountAfter.status == status)
    assert.ok(userAccountAfter.bannerImageHash == bannerImageHash)
    assert.ok(userAccountAfter.extra1 == extra1)
    assert.ok(userAccountAfter.extra2 == newExtra2)

    extra2 = newExtra2
  })
})
