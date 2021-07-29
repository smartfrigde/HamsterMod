let openpgp = undefined;

// Dynamically load library as bundle size dramatically (3x) increases if we just import / use with NPM

const loadLibrary = async () => {
  const jsCached = goosemod.storage.get('goosemodPgpLibrary');
  const js = jsCached || await (await fetch(`https://api.goosemod.com/pgp.js`)).text();

  if (!jsCached) goosemod.storage.set('goosemodPgpLibrary', js);

  eval(js);

  openpgp = window.openpgp;
  delete window.openpgp;
};

export const verifySignature = async (_publicKey, _signature, _original) => {
  if (!openpgp) await loadLibrary();

  const publicKey = await openpgp.readKey({ armoredKey: _publicKey });

  const message = await openpgp.createMessage({ text: _original });

  const signature = await openpgp.readSignature({
    armoredSignature: _signature // parse detached signature
  });

  const verificationResult = await openpgp.verify({
      message, // Message object
      signature,
      verificationKeys: publicKey
  });

  const { verified, keyID } = verificationResult.signatures[0];

  try {
      await verified; // throws on invalid signature

      goosemod.logger.debug('pgp', 'verified, key id:', keyID.toHex());
      return true;
  } catch (e) {
      goosemod.logger.debug('pgp', 'failed to verify', e.message);
      return false;
  }
};