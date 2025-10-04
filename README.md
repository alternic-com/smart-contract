# Escrow — Spécification du smart contract et README

## Build and test

Dependencies install: `yarn` (?)

Build: `anchor build`.

Test: `anchor test`.

## Contexte & objectifs

But : fournir un smart contract Solana (Anchor) qui permet de:
+ Déposer un NFT (domain NFT) sur la plateforme (fait).
+ Le retirer (fait).
+ Le mettre en vente, accepter des offres et en faire.
+ Vente à crédit.
+ Loan contre NFT.

### Vente simple:

+ Si on possède un NFT, pouvoir faire une offres de vente avec la currency de son choix (todo voir pour en whitelister 2/3).

+ Pouvoir faire une offre sur n'importe quel NFT (et ça bloque nos fonds pour qu'elle puisse être acceptée).

### Vente à crédit:

+ Le propriétaire du NFT mets une offre de vente à crédit. Pour cette vente, l’acheteur doit payer x€/mois pendant y temps, puis z€ (ça todo les modalités). Pendant ce crédit, le NFT reste sur la plateforme, mais l’acheteur est l’owner et peut changer ce sur quoi redirige le domaine

### Prêt contre NFT

+ Pouvoir mettre une offre de prêt, à taux fixe, pendant 1an, remboursable de manière anticipée.
Peut être: Pouvoir déclencher une enchère (sur le taux) pendant 1sem pour un prêt d’un an.
Pouvoir le mettre en vente même si on un prêt encours avec, auquel cas ça rembourse atomiquement le prêt avec les fonds de la vente.


## Résumé API (instructions)

### 1) `deposit(seed: u64)`

+ Crée le compte `EscrowState` (PDA) et initialise un `vault` associated token account pour stocker le NFT. Transfère 1 token (NFT) du `maker` vers `vault`.

### 2) `withdraw()`

+ Transfère le NFT du `vault` vers `maker_ata_domain` en signant avec la PDA `escrow`.

## Accounts & storage

### `EscrowState`

```rust
#[account]
pub struct EscrowState {
    pub seed: u64,
    pub maker: Pubkey,        // The person who created the escrow
    pub owner: Pubkey,        // "Owner" of the domain: can modify what it resolves to
    pub mint_domain: Pubkey,  // The mint of our NFT
    pub mint_currency: Pubkey,// The mint of the currency used for dealing with this domain (eg USDC)
    // Feature 1: Make a loan offer
    pub wanted_loan_amount: u64,
    pub wanted_apy: u64,
    // Feature 2: Make a location with buy option
    // todo
    // Feature 3: Make a sell offer
    pub wanted_sell_amount: u64,
    // Rest
    pub bump: u8,
}
```

## Structure des fichiers

* `lib.rs` : entrypoint Anchor, définit instructions.
* `contexts/*.rs` : handlers d'instructions (deposit, withdraw, sell, offer...).
* `state/*.rs` : structures persistantes (EscrowState, OfferState, LoanState).
* `tests/` : tests.


## Liste des todos futures

**Vente**

**Loan**
