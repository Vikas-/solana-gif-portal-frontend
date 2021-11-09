import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';

import idl from './idl.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram } = web3;

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Get our program's id form the IDL file.
// const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: 'processed',
};

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
  'https://media3.giphy.com/media/meNaovDMpxyUw/200w.webp?cid=ecf05e47w09nt3m2uqmc7ws259sludmi7qmlwaa7h6hcpu6r&rid=200w.webp&ct=g',
  'https://media3.giphy.com/media/SwD9JjkA073Og/200w.webp?cid=ecf05e47op34udfamobjrths8z7pspbngmjeb4wsuwthymcb&rid=200w.webp&ct=g',
  'https://media2.giphy.com/media/NitUKhyVlDseQ/200w.webp?cid=ecf05e47uhjlpfhtusw8h30o81vodr6q4ityze7t568efnew&rid=200w.webp&ct=g',
  'https://media0.giphy.com/media/Z3jYItTF8OvuM/200w.webp?cid=ecf05e47o0q9etum4rxwcpmqfb03ru6gvdv16ul40lgz8h1a&rid=200w.webp&ct=g',
];

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const [baseAccount, setBaseAccount] = useState(null);
  const [bump, setBump] = useState(null);
  const [provider, setProvider] = useState(null);
  const [otherPK, setOtherPK] = useState('');
  const [tipValue, setTipValue] = useState(0);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found');

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with public key: ',
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        } else {
          console.log('Solana found but is not phantom.');
        }
      } else {
        alert('Solana object not found! Get a phantom wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key: ', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const payTip = async (item) => {
    if (tipValue <= 0) return;
    try {
      const program = new Program(idl, programID, provider);
      let pK = new PublicKey(item.adder);

      console.log('Base account: ', baseAccount);

      await program.rpc.sendSol(new BN(tipValue), {
        accounts: {
          from: provider.wallet.publicKey,
          to: pK,
          systemProgram: SystemProgram.programId,
        },
      });
    } catch (error) {
      console.error('Error occurred: ', error);
    }
  };

  const upvoteGif = async (item) => {
    try {
      // const provider = getProvider();
      const program = new Program(idl, programID, provider);

      let pK = new PublicKey(item.adder);

      let [gifBaseAccount, bump] = await web3.PublicKey.findProgramAddress(
        [Buffer.from('gifListVikas2'), pK.toBytes()],
        programID
      );

      await program.rpc.upvoteGif(item.url, {
        accounts: {
          baseAccount: gifBaseAccount,
          user: provider.wallet.publicKey,
        },
      });

      console.log('Successfully upvoted');
      await getGifListForPublicKey(item.adder);
    } catch (error) {
      console.error('Could not upvote', error);
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given');
    }
    console.log('Gif link:', inputValue);
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      console.log('baseAccount: ', baseAccount);
      console.log('list Owner: ', provider.wallet.publicKey);
      console.log('User: ', provider.wallet.publickKey);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount,
          listOwner: provider.wallet.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('GIF sucesfully sent to program', inputValue);

      await getGifList();
    } catch (error) {
      console.log('Error sending GIF:', error);
    }
  };

  const onInputChangePK = (event) => {
    const value = event.target.value;
    setOtherPK(value);
  };

  const onTipValueChange = (event) => {
    const value = event.target.value;
    setTipValue(value);
  };

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <input
            type="text"
            onChange={onInputChangePK}
            value={otherPK}
            placeholder="Enter a public key!"
          ></input>
          <button
            className="cta-button submit-gif-button"
            onClick={() => {
              getGifListForPublicKey(otherPK);
            }}
          >
            Get GIFs
          </button>
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button className="cta-button submit-gif-button" onClick={sendGif}>
            Submit
          </button>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.length > 0 &&
              gifList.map((item, index) => (
                <div className="gif-item" key={index}>
                  <img src={item.url} />
                  <p className="gradient-text">{item.adder.toString()}</p>
                  <div>
                    <button
                      className="cta-button submit-gif-button"
                      onClick={() => {
                        upvoteGif(item);
                      }}
                    >
                      Upvote
                    </button>
                    <p className="gradient-text">{item.votes.toString()}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter gif link!"
                    value={tipValue}
                    onChange={onTipValueChange}
                  />
                  <button
                    className="cta-button submit-gif-button"
                    onClick={() => {
                      payTip(item);
                    }}
                  >
                    Tip
                  </button>
                </div>
              ))}
          </div>
        </div>
      );
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('ping');
      await program.rpc.newList(bump, {
        accounts: {
          baseAccount: baseAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log(
        'Created a new BaseAccount w/ address:',
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log('Error creating BaseAccount account:', error);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount);

      console.log('Got the account', account);
      setGifList(account.gifs);
    } catch (error) {
      console.log('Error in getGifs: ', error);
      setGifList(null);
    }
  };

  const getGifListForPublicKey = async (publicKey) => {
    try {
      const program = new Program(idl, programID, provider);

      let pK = new PublicKey(publicKey);

      let [otherAccount, bump] = await web3.PublicKey.findProgramAddress(
        [Buffer.from('gifListVikas2'), pK.toBytes()],
        programID
      );

      const account = await program.account.baseAccount.fetch(otherAccount);

      console.log('Got the account', account);
      setGifList(account.gifs);
    } catch (error) {
      console.error('Failed to fetch gifList', error);
    }
  };

  /*
   * Get baseAccount associated with this program?
   */
  async function getListAddress() {
    console.log('provider: ', provider);
    console.log('Provider wallet publicKey: ', provider.wallet.publicKey);
    console.log('program id: ', programID);
    let [baseAccount, bump] = await web3.PublicKey.findProgramAddress(
      [Buffer.from('gifListVikas2'), provider.wallet.publicKey.toBytes()],
      programID
    );

    return { baseAccount, bump };
  }

  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  useEffect(() => {
    if (walletAddress && baseAccount) {
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress, baseAccount]);

  useEffect(() => {
    if (walletAddress && provider) {
      console.log('Provider before fetching baseaccount: ', provider);
      async function fetchBaseAccount() {
        let { baseAccount, bump } = await getListAddress();
        setBaseAccount(baseAccount);
        setBump(bump);
      }
      fetchBaseAccount();
    }
  }, [walletAddress, provider]);

  useEffect(() => {
    const provider = getProvider();
    console.log('Provider after initialization: ', provider);
    setProvider(provider);
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Critcket GIFs</p>
          <p className="sub-text">
            View your cricket GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
