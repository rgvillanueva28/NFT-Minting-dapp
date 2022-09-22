import Head from "next/head";
import Web3Modal, { Provider } from "web3modal";
import { providers, Contract, ethers } from "ethers";
import { hexValue, parseEther } from "ethers/lib/utils";
import { useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESS, abi, goerli } from "../constants";
import Image from "next/image";

export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // presaleStarted keeps track of whether the presale has started or not
  const [presaleStarted, setPresaleStarted] = useState(false);
  // presaleEnded keeps track of whether the presale ended
  const [presaleEnded, setPresaleEnded] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const [loading, setLoading] = useState(false);
  // numberOfWhitelisted tracks the number of addresses's whitelisted

  const [walletAddress, setWalletAddress] = useState("");
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState();

  const provider = useRef();
  const web3ModalRef = useRef();
  const library = useRef();
  const networkConnected = useRef();

  /**
   * presaleMint: Mint an NFT during the presale
   */
  const presaleMint = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      // call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await nftContract.presaleMint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Rane G NFT!");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setErrorMessage(err.message);
    }
  };

  /**
   * publicMint: Mint an NFT after the presale
   */
  const publicMint = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      // call the mint from the contract to mint the Crypto Dev
      const tx = await nftContract.mint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Rane G NFT!");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setErrorMessage(err.message);
    }
  };

  /**
   * startPresale: starts the presale for the NFT Collection
   */
  const startPresale = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      // call the startPresale from the contract
      const tx = await nftContract.startPresale();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      // set the presale started to true
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
      setIsError(true);
      setErrorMessage(err.message);
    }
  };

  /**
   * checkIfPresaleStarted: checks if the presale has started by quering the `presaleStarted`
   * variable in the contract
   */
  const checkIfPresaleStarted = async () => {
    try {
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, library.current);
      // call the presaleStarted from the contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * checkIfPresaleEnded: checks if the presale has ended by quering the `presaleEnded`
   * variable in the contract
   */
  const checkIfPresaleEnded = async () => {
    try {
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, library.current);
      // call the presaleEnded from the contract
      const _presaleEnded = await nftContract.presaleEnded();
      // _presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _presaleEnded timestamp is less than the current time
      // which means presale has ended
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * getOwner: calls the contract to retrieve the owner
   */
  const getOwner = async () => {
    try {
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, library.current);
      // call the owner function from the contract
      const _owner = await nftContract.owner();
      // We will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getSigner(true);
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  /**
   * getTokenIdsMinted: gets the number of tokenIds that have been minted
   */
  const getTokenIdsMinted = async () => {
    try {
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, library.current);
      // call the tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();
      //_tokenIds is a `Big Number`. We need to convert the Big Number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const connectWallet = async () => {
    try {
      provider.current = await web3ModalRef.current.connect();
      library.current = new providers.Web3Provider(provider.current);
      let accounts = await library.current.send("eth_requestAccounts", []);
      networkConnected.current = await library.current.getNetwork();
      // console.log(_networkConnected)
      setWalletConnected(true);

      if (accounts) setWalletAddress(accounts[0]);

      setIsError(false);
      checkNetwork();
    } catch (err) {
      setIsError(true);
      setErrorMessage(err.message);
      setIsCorrectNetwork(false);
      console.log("Connect");
      console.error(err.message);
      // throw new Error(err);
    }
  };

  const getSigner = async () => {
    if (await checkNetwork()) {
      const signer = library.current.getSigner();
      return signer;
    }
  };

  const checkNetwork = async () => {
    let isGoerli;

    if (networkConnected.current.chainId !== goerli.chainId) {
      try {
        await library.current.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexValue(goerli.chainId) }],
        });
        setIsCorrectNetwork(true);
        setIsError(false);
        isGoerli = true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await library.current.provider.request({
              method: "wallet_switchEthereumChain",
              params: [networkParams[hexValue(goerli.chainId)]],
            });
            setIsCorrectNetwork(true);
            setIsError(false);
            isGoerli = true;
          } catch (error) {
            // setIsError(true);
            // setErrorMessage(err.message);
            console.log("switch error 4902 1");
            isGoerli = false;
          }
        } else {
          // setIsError(true);
          // setErrorMessage(switchError.message);
          console.log("switch error 4902 2");
          isGoerli = false;
        }
      }
    } else {
      isGoerli = true;
    }

    if (isGoerli) {
      setIsCorrectNetwork(true);
      getTokenIdsMinted();
      return true;
    } else {
      setIsCorrectNetwork(false);
      getTokenIdsMinted();
      return false;
    }
  };

  useEffect(() => {
    web3ModalRef.current = new Web3Modal({
      cacheProvider: true,
      network: "goerli",
      providerOptions: {},
    });
    if (web3ModalRef.current.cachedProvider) {
      console.log("Cached Provider");
      connectWallet();
    }
  }, []);

  const disconnect = async () => {
    await web3ModalRef.current.clearCachedProvider();
    refreshState();
  };

  const refreshState = () => {
    setWalletConnected(false);
    setWalletAddress();
    // set;
  };

  useEffect(() => {
    if (provider.current?.on) {
      const handleAccountsChanged = (accounts) => {
        if (accounts) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress();
        }
      };

      const handleChainChanged = (_hexChainId) => {
        checkNetwork();
      };

      const handleDisconnect = () => {
        console.log("disconnect", isError);
        disconnect();
      };

      provider.current.on("accountsChanged", handleAccountsChanged);
      // provider.current.on("chainChanged", handleChainChanged);
      provider.current.on("disconnect", handleDisconnect);

      // Check if presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // Set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      // set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);

      return () => {
        if (provider.current.removeListener) {
          provider.current.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          provider.current.removeListener("chainChanged", handleChainChanged);
          provider.current.removeListener("disconnect", handleDisconnect);
        }
      };
    }
  }, [provider.current]);

  /*
    renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    if (walletConnected) {
      if (!isCorrectNetwork) {
        return (
          <button
            onClick={checkNetwork}
            className="bg-blue-500 p-5 rounded-xl text-white font-semibold mr-auto ml-auto md:mr-auto md:ml-0"
          >
            Switch Network
          </button>
        );
      } else if (loading) {
        return <button className="">Loading...</button>;
      } else if (isOwner && !presaleStarted) {
        return (
          <button
            className="bg-blue-500 p-5 rounded-xl text-white font-semibold mr-auto ml-auto md:mr-auto md:ml-0"
            onClick={startPresale}
          >
            Start Presale!
          </button>
        );
      } else if (!presaleStarted) {
        return (
          <div>
            <div className="">Presale has not started yet!</div>
          </div>
        );
      } // If presale started, but hasn't ended yet, allow for minting during the presale period
      else if (presaleStarted && !presaleEnded) {
        return (
          <div>
            <div className="">
              Presale has started!!! If your address is whitelisted, Mint a Rane
              G NFT
            </div>
            <button
              className="bg-blue-500 p-5 rounded-xl text-white font-semibold mr-auto ml-auto md:mr-auto md:ml-0"
              onClick={presaleMint}
            >
              Presale Mint 🚀
            </button>
          </div>
        );
      } else if (presaleStarted && presaleEnded) {
        return (
          <button
            className="bg-blue-500 p-5 rounded-xl text-white font-semibold mr-auto ml-auto md:mr-auto md:ml-0"
            onClick={publicMint}
          >
            Public Mint 🚀
          </button>
        );
      }
    } else {
      return (
        <button
          onClick={() => connectWallet()}
          className="bg-blue-500 p-5 rounded-xl text-white font-semibold mr-auto ml-auto md:mr-auto md:ml-0"
        >
          Connect your wallet
        </button>
      );
    }
  };

  const renderMintedCount = () => {
    return walletConnected && isCorrectNetwork ? (
      <span>
        <b className="text-2xl md:text-3xl">{tokenIdsMinted}</b> has already
        been minted.
      </span>
    ) : (
      `Connect wallet to see number of minted`
    );
  };

  const renderWalletConnected = () => {
    return walletConnected ? (
      isCorrectNetwork ? (
        <span className="text-green-500">Connected</span>
      ) : (
        <span className="text-red-500">Wrong Network</span>
      )
    ) : (
      <span className="text-red-500">Not connected</span>
    );
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  // useEffect(() => {
  //   // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
  //   async function checkWalletConnected() {
  //     await getProviderOrSigner();
  //   }
  //   checkWalletConnected();
  // }, [walletConnected]);

  return (
    <div>
      <Head>
        <title>Minting Dapp</title>
        <meta name="description" content="Minting-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-between">
        <main className="container flex md:flex-grow flex-col md:flex-row items-center justify-center text-center md:text-left">
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl mb-2 font-bold">
              Welcome to Rane G Minting dApp!
            </h1>
            <div className="text-xl md:text-2xl mb-4">
              An NFT Collection Minting dApp made by <b>Rane G</b>.
            </div>
            <div className="text-lg md:text-xl mb-4">{renderMintedCount()}</div>
            {renderButton()}
            {isError ? (
              <div className="text-red-500 text-base">{errorMessage}</div>
            ) : null}

            {walletConnected ? (
              <div className="text-lg md:text-xl my-4">{walletAddress}</div>
            ) : null}

            <div className="text-lg md:text-xl mb-4">
              Wallet Connection: {renderWalletConnected()}
            </div>

            <div className="text-lg md:text-xl">Network: Goerli Testnet</div>
          </div>
          <div className="relative w-96 h-72 ">
            <Image
              // className="rounded-full"
              className="max-w-xs max-h-24"
              layout="fill"
              width={300}
              alt="Web3 Image"
              src="/web3.jpg"
            />
          </div>
        </main>

        <footer className="">
          Made by <b>Rane G</b>
        </footer>
      </div>
    </div>
  );
}
