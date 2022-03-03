import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { Friends } from '../target/types/friends'
import assert from 'assert'
import { associatedAddress } from '@project-serum/anchor/dist/cjs/utils/token'
import microbs58  from 'micro-base58';
const bs58 = require('bs58')
const { SystemProgram } = anchor.web3

describe('friends', () => {
    const provider = anchor.Provider.env()

    anchor.setProvider(provider)

    const program = anchor.workspace.Friends as Program<Friends>

    let user1 = anchor.web3.Keypair.generate()
    let user2 = anchor.web3.Keypair.generate()

    let intPublicKeyUser1 = parseInt(Buffer.from(bs58.decode(user1.publicKey.toBase58())).toString('hex'), 16)
    let intPublicKeyUser2 = parseInt(Buffer.from(bs58.decode(user2.publicKey.toBase58())).toString('hex'), 16)
    if (intPublicKeyUser1 < intPublicKeyUser2) {
        const tmp = user2;
        user2 = user1;
        user1 = tmp;
        // take some second in order the changes to take effect
        new Promise(r => setTimeout(r, 5000));
    }

    const user1_seed = user1.publicKey.toBuffer()
    const user2_seed = user2.publicKey.toBuffer()
    
    const request = anchor.utils.publicKey.findProgramAddressSync(
        [user1_seed, user2_seed],
        program.programId,
      )

    const otherPayer = anchor.web3.Keypair.generate()
    const otherUser = anchor.web3.Keypair.generate()

    let user3 = anchor.web3.Keypair.generate()
    let user4 = anchor.web3.Keypair.generate()

    let intPublicKeyUser3 = parseInt(Buffer.from(bs58.decode(user3.publicKey.toBase58())).toString('hex'), 16)
    let intPublicKeyUser4 = parseInt(Buffer.from(bs58.decode(user4.publicKey.toBase58())).toString('hex'), 16)
    if (intPublicKeyUser3 < intPublicKeyUser4) {
            const tmp = user4;
            user4 = user3;
            user3 = tmp;
            // take some second in order the changes to take effect
            new Promise(r => setTimeout(r, 5000));
        }


    const user3_seed = user3.publicKey.toBuffer()
    const user4_seed = user4.publicKey.toBuffer()
        
    const newRequest = anchor.utils.publicKey.findProgramAddressSync(
            [user3_seed, user4_seed],
            program.programId,
    )

    
    const k = 'dhfskjdfhsdjkfhsdjkfhdsjkhdjkfds'.repeat(4)

    it('User 1 cannot create a new request for user 2 (payer user 1) with different order of accounts', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        let failed = false
        try {
            await program.rpc.makeRequest(user2.publicKey, user1.publicKey, k, {
            accounts: {
                request: request[0],
                user: user1.publicKey,
                payer: user1.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [user1],
            })
        } catch(err) {
            const err_msg = err.logs[4].split(": ")[1]
            const errMsg = "Cross-program invocation with unauthorized signer or writable account"
            assert.equal(errMsg, err_msg)
            failed = true
        }

       assert.ok(failed)
    })

    it('User 1 creates a new request for user 2 (payer user 1)', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])

      
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

    })


    it('User 2 cannot create a new request for user 1 (payer user 2) after user 1 creates the request for user 2', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user2.publicKey, 10000000000),
          'confirmed',
        )
        try {
            await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
            accounts: {
                request: request[0],
                user: user2.publicKey,
                payer: user2.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [user2],
            })
        } catch(err) {
            const errMsg = "Request already existent"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

    })

    it('Extern user cannot create a new request for user1 and user 2', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        let failed = false
        try{
            await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
            accounts: {
                request: request[0],
                user: otherUser.publicKey,
                payer: user1.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [user1, otherUser],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
            failed = true
        }
    
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])

        assert.ok(failed)
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('User 5 cannot create a request for user 6 if public key (numeric value) of user 5 is less then public key of user 6', async () => {
    let user5 = anchor.web3.Keypair.generate()
    let user6 = anchor.web3.Keypair.generate()

    let intPublicKeyUser5 = parseInt(Buffer.from(bs58.decode(user5.publicKey.toBase58())).toString('hex'), 16)
    let intPublicKeyUser6 = parseInt(Buffer.from(bs58.decode(user6.publicKey.toBase58())).toString('hex'), 16)
    if (intPublicKeyUser5 > intPublicKeyUser6) {
            const tmp = user6;
            user6 = user5;
            user5 = tmp;
            // take some second in order the changes to take effect
            new Promise(r => setTimeout(r, 5000));
        }


    const user5_seed = user5.publicKey.toBuffer()
    const user6_seed = user6.publicKey.toBuffer()
        
    const newRequest = anchor.utils.publicKey.findProgramAddressSync(
            [user5_seed, user6_seed],
            program.programId,
    )
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(otherUser.publicKey, 10000000000),
        'confirmed',
    )
    let failed = false
    try {
        await program.rpc.makeRequest(user5.publicKey, user6.publicKey, k, {
        accounts: {
            request: newRequest[0],
            user: user5.publicKey,
            payer: otherUser.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user5, otherUser],
        })
    } catch(err) {
        const errMsg = "User1 and user2 needs to be passed in order"
        assert.equal(errMsg, err.msg)
        failed = true
    }
    
    const requestAccountsAll = await program.account.friendRequest.all()
    const requestAccountsPending = await program.account.friendRequest.all([
        {
            memcmp: {
                offset: 8+32,
                bytes: microbs58(Buffer.from([1])),
            }
        }
    ])
    const requestAccountsAccepted = await program.account.friendRequest.all([
        {
            memcmp: {
                offset: 8+32,
                bytes: microbs58(Buffer.from([2])),
            }
        }
    ])
    const requestAccountsDenied = await program.account.friendRequest.all([
        {
            memcmp: {
                offset: 8+32,
                bytes: microbs58(Buffer.from([3])),
            }
        }
    ])
    const requestAccountsRemoved = await program.account.friendRequest.all([
        {
            memcmp: {
                offset: 8+32,
                bytes: microbs58(Buffer.from([4])),
            }
        }
    ])

    assert.ok(failed)
    assert.ok(requestAccountsAll.length == 1)
    assert.ok(requestAccountsPending.length == 1)
    assert.ok(requestAccountsAccepted.length == 0)
    assert.ok(requestAccountsDenied.length == 0)
    assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('Creates a new request from user 3 to user 4 (payer other User)', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(otherUser.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user3.publicKey, user4.publicKey, k, {
        accounts: {
            request: newRequest[0],
            user: user3.publicKey,
            payer: otherUser.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user3, otherUser],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(newRequest[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user3.publicKey))
        assert.ok(requestAccount.to.equals(user4.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('The creator of the request cannot deny his own request', async () => {
        try {
            await program.rpc.denyRequest({
            accounts: {
                request: request[0],
                user: user1.publicKey,
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('Impostor cannot deny any request', async () => {
        try {
            await program.rpc.denyRequest({
            accounts: {
                request: request[0],
                user: otherUser.publicKey,
            },
            signers: [otherUser],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 2 deny request from user 1', async () => {
        await program.rpc.denyRequest({
        accounts: {
            request: request[0],
            user: user2.publicKey,
        },
        signers: [user2],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'denied')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 1)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 2 cannot deny a request already denied from user 1', async () => {
        try {
            await program.rpc.denyRequest({
            accounts: {
                request: request[0],
                user: user2.publicKey,
            },
            signers: [user2],
            })
        } catch(err) {
            const errMsg = "Request is not pending"
            assert.equal(errMsg, err.msg)
        }
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'denied')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 1)
        assert.ok(requestAccountsRemoved.length == 0)
        
        
    })

    it('Creates a new request after denied from user 1 (payer user 1)', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
       
    })

    it('The creator of the request cannot accept his own request', async () => {
        try {
            await program.rpc.acceptRequest(k, {
            accounts: {
                request: request[0],
                user: user1.publicKey,
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('Impostor cannot accept any request', async () => {
        try {
            await program.rpc.acceptRequest(k, {
            accounts: {
                request: request[0],
                user: otherUser.publicKey,
            },
            signers: [otherUser],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 2 accepts Request from user 1', async () => {
        await program.rpc.acceptRequest(k, {
        accounts: {
            request: request[0],
            user: user2.publicKey,
        },
        signers: [user2],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

        
    })

    it('User 2 cannot accept a request already accepted from user 1', async () => {
        try{
            await program.rpc.acceptRequest(k, {
            accounts: {
                request: request[0],
                user: user2.publicKey,
            },
            signers: [user2],
            })
        } catch(err) {
            const errMsg = "Request is not pending"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('user 1 cannot create a new request for user 2 when it is already accepted', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        try {
            await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
            accounts: {
                request: request[0],
                user: user1.publicKey,
                payer: user1.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "Request already existent"
            assert.equal(errMsg, err.msg)
        }
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('User 1 cannot remove a request for user 2 when they are friends', async () => {
        try{
            await program.rpc.removeRequest({
            accounts: {
                request: request[0],
                user: user1.publicKey,
                payer: user1.publicKey
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "Users are already friends"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('Impostor cannot remove any request', async () => {
        try{
            await program.rpc.removeRequest({
            accounts: {
                request: request[0],
                user: otherUser.publicKey,
                payer: user1.publicKey
            },
            signers: [user1, otherUser],
            })
        } catch(err) {
            const errMsg = "User can't perform this action"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('Impostor cannot remove friends from any request', async () => {
        try{
            await program.rpc.removeFriend({
            accounts: {
                request: request[0],
                user: otherUser.publicKey,
            },
            signers: [otherUser],
            })
        } catch(err) {
            const errMsg = "Addresses in request don't match user address"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 1 removes friend from accepted request', async () => {
        
        await program.rpc.removeFriend({
        accounts: {
            request: request[0],
            user: user1.publicKey,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'removed')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 1)
        
    })

    it('User 1 cannot remove friend from removed request because they are not friend anymore', async () => {
        try{
            await program.rpc.removeFriend({
            accounts: {
                request: request[0],
                user: user1.publicKey,
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "Accounts are not friends yet"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'removed')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 1)
        
    })

    it('User 1 creates again a new request for user 2 (payer user 1)', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('User 2 accepts Request from user 1', async () => {
        await program.rpc.acceptRequest(k, {
        accounts: {
            request: request[0],
            user: user2.publicKey,
        },
        signers: [user2],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 2 cannot deny a request that is accepted', async () => {
        try {
            await program.rpc.denyRequest({
            accounts: {
                request: request[0],
                user: user2.publicKey,
            },
            signers: [user2],
            })
        } catch(err) {
            const errMsg = "Request is not pending"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })


    it('User 1 (payer) cannot remove accepted request', async () => {
        try{
            await program.rpc.removeRequest({
            accounts: {
                request: request[0],
                user: user1.publicKey,
                payer: user1.publicKey
            },
            signers: [user1],
            })
        } catch(err) {
            const errMsg = "Users are already friends"
            assert.equal(errMsg, err.msg)
        }

        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == k)
        assert.ok(Object.keys(requestAccount.status)[0] == 'accepted')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 1)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
        
    })

    it('User 2 cannot remove friend from accepted request', async () => {
        try{
            await program.rpc.removeFriend({
            accounts: {
                request: request[0],
                user: user2.publicKey,
            },
            signers: [user2],
            })
        } catch(err) {
            const errMsg = "Users are already friends"
            assert.equal(errMsg, err.msg)
        }
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'removed')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 1)
        
    })

    it('User 1 (payer) cannot remove request with different payer', async () => {
        try{
            await program.rpc.removeRequest({
            accounts: {
                request: request[0],
                user: user1.publicKey,
                payer: otherUser.publicKey
            },
            signers: [user1, otherUser],
            })
        } catch(err) {
            const errMsg = "Account was not created by provided user"
            assert.equal(errMsg, err.msg)
        }
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == "")
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'removed')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 1)
        
    })

    it('Create the same request as before after removing friend', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('User 1 removes request (payer user 1)', async () => {
        await program.rpc.removeRequest({
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey
        },
        signers: [user1],
        })
        let failed = false
        try{
            let requestAccount = await program.account.friendRequest.fetch(request[0])
        } catch (err) {
            failed = true
        }
        
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])

        assert.ok(failed)
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

    })

    it('Create the same request as before after deleting it', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('User 1 removes request again (payer user 1)', async () => {
        await program.rpc.removeRequest({
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey
        },
        signers: [user1],
        })
        let failed = false
        try{
            let requestAccount = await program.account.friendRequest.fetch(request[0])
        } catch (err) {
            failed = true
        }
        
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])

        assert.ok(failed)
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

    })

    it('User 3 removes request again (payer other user)', async () => {
        await program.rpc.removeRequest({
        accounts: {
            request: newRequest[0],
            user: user3.publicKey,
            payer: otherUser.publicKey
        },
        signers: [user3, otherUser],
        })
        let failed = false
        try{
            let requestAccount = await program.account.friendRequest.fetch(newRequest[0])
        } catch (err) {
            failed = true
        }

        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
        
        assert.ok(failed)
        assert.ok(requestAccountsAll.length == 0)
        assert.ok(requestAccountsPending.length == 0)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)

    })
    
    it('Create a request with a Payer the is none of users in request', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(otherPayer.publicKey, 10000000000),
          'confirmed',
        )

        const user3_seed = user3.publicKey.toBuffer()
        const user4_seed = user4.publicKey.toBuffer()
        
        const newRequest = anchor.utils.publicKey.findProgramAddressSync(
            [user3_seed, user4_seed],
            program.programId,
        )

        await program.rpc.makeRequest(user3.publicKey, user4.publicKey, k, {
        accounts: {
            request: newRequest[0],
            user: user3.publicKey,
            payer: otherPayer.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user3, otherPayer],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(newRequest[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user3.publicKey))
        assert.ok(requestAccount.to.equals(user4.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 1)
        assert.ok(requestAccountsPending.length == 1)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })

    it('Create the same request as before after deleting it', async () => {
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user1.publicKey, 10000000000),
          'confirmed',
        )
        await program.rpc.makeRequest(user1.publicKey, user2.publicKey, k, {
        accounts: {
            request: request[0],
            user: user1.publicKey,
            payer: user1.publicKey,
            systemProgram: SystemProgram.programId,
        },
        signers: [user1],
        })
        
        let requestAccount = await program.account.friendRequest.fetch(request[0])
        const requestAccountsAll = await program.account.friendRequest.all()
        const requestAccountsPending = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([1])),
                }
            }
        ])
        const requestAccountsAccepted = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([2])),
                }
            }
        ])
        const requestAccountsDenied = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([3])),
                }
            }
        ])
        const requestAccountsRemoved = await program.account.friendRequest.all([
            {
                memcmp: {
                    offset: 8+32,
                    bytes: microbs58(Buffer.from([4])),
                }
            }
        ])
       
        assert.ok(requestAccount.from.equals(user1.publicKey))
        assert.ok(requestAccount.to.equals(user2.publicKey))
        assert.ok(requestAccount.fromEncryptedKey == k)
        assert.ok(requestAccount.toEncryptedKey == "")
        assert.ok(Object.keys(requestAccount.status)[0] == 'pending')
        assert.ok(requestAccountsAll.length == 2)
        assert.ok(requestAccountsPending.length == 2)
        assert.ok(requestAccountsAccepted.length == 0)
        assert.ok(requestAccountsDenied.length == 0)
        assert.ok(requestAccountsRemoved.length == 0)
       
    })
    
})
