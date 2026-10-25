# REA · 19. Coupon, punti e card: il perimetro della transizione (25/10/2026)

*Richiesta di Edoardo (25/10, 03:12): la cassa nuova deve sostituire quella vecchia **senza lasciare clienti a metà**. Coupon, punti e card sono parte del servizio, non accessori. La transizione si fa in parallelo, finché non è sicuro che funzioni tutto. Il REA è pronto solo quando Edoardo dice «ho visto tutto e sono pronto».*

Questo file non ripete i dettagli: li rimanda ai capitoli già scritti. Dice cosa manca per dire che questa parte è coperta.

## 1. Cosa esiste oggi, dove sta scritto

| Pezzo | Dove si legge | Stato nella cassa nuova (23–24/10) |
|---|---|---|
| Card cliente, numero e scadenza, tipo (automatica alla registrazione) | `01` §clienti, `02` §5.2 | campi nel cliente (mig. 0026). Il QR dell'app non è letto in cassa |
| Punti fidelity: saldo, storico, premi a 10/20/30 punti | `01` §premi, `02` §5.2, `16` domanda 9 | saldo importato e premi spenti. **Punti per euro sconosciuti** |
| Credito prepagato (saldo credito) | `01` §clienti, `02` §5.2 | campo presente nel cliente, regole ignote. Nell'app `mostra_credito` è 0 |
| Coupon: 54 schede, regole (fascia, solo domicilio/ritiro, minimo, omaggio) | `01` §coupon, `13` §13.3 | regole base (0026): % o €, minimo, periodo. **Mancano**: validità a ore, solo primo ordine, giorno della settimana, codice dinamico |
| Coupon emessi (~10 al giorno) e uso | `01` §coupon emessi | emissione non modellata |
| Lista coupon «da ottenere» e «da usare» nell'app | `02` §5.3 | non c'è |
| Tag automatico sul cliente («coupon usato: …») | `01` §clienti, tag | non c'è |
| Notifiche di carico punti, coupon assegnato, carrello abbandonato | `01` §notifiche automatiche | in-app push da fare (`11`) |

## 2. Cosa serve perché sia completo

1. **Card in cassa.** La cassa deve trovare il cliente dal QR dell'app o dal numero della card, oltre che dal telefono. Oggi l'app mostra il QR «da mostrare alla cassa» (`02` §5.2), e in cassa nessuno lo legge.
2. **Motore dei punti.** Quanti punti per euro e per ordine; se gli ordini al telefono e al banco danno punti; quando un premio si riscatta e con quale saldo. Senza questo il saldo importato non si può far crescere.
3. **Import completo.** Non solo il saldo: anche i coupon che il cliente ha già ottenuto e non ha usato, la card, il credito, il tag e il consenso. Un cliente che torna dopo il passaggio deve ritrovare tutto.
4. **Doppio sistema in parallelo.** Un coupon non può essere usato due volte, una volta nel vecchio e una nel nuovo. Un punto non può essere sommato due volte. Serve una regola scritta: chi è la fonte di verità per ogni cliente, per ogni giorno del parallelo.
5. **Coupon con regole vere.** Validità a ore («GIOVEDÌ SONO FRITTO» vale 3 ore dall'ottenimento e il giovedì), solo primo ordine («Benvenuto»), per canale di acquisizione («Benvenuto da APP», «da volantino»), codice dinamico, omaggio da scegliere.
6. **Coupon che arrivano da fuori.** Il WhatsApp «NON CUCINO» (50 usi) e i coupon di ActiveCampaign o Brevo non devono rompersi quando cambia la cassa.
7. **In cassa.** Il codice coupon si legge, si applica, e chi lo usa resta scritto (come «usato da» nel vecchio).
8. **App cliente.** Lista coupon ottenibili e usabili, punti, premi con il costo in punti, storico con i punti. Questo è il pezzo che richiede il conto Apple e l'app nostra (`08`, `10` riga 16).

## 3. Criteri per dire «pronto»

- Un cliente con 1 coupon «Benvenuto» non usato, 25 punti e una card: nel nuovo vede lo stesso coupon, lo stesso saldo e la stessa card.
- Lo stesso coupon non si applica due volte, in nessuno dei due sistemi, il giorno del passaggio.
- Un premio a 10 punti si riscatta e il saldo scende, nella cassa nuova.
- Il giorno del parallelo, i saldi dei due sistemi per lo stesso cliente coincidono, o la differenza è spiegata.
- I coupon settimanali (lun–gio) e «GIOVEDÌ SONO FRITTO» si applicano con le stesse regole del vecchio.

## 4. Domande per Edoardo

Le domande sono in `18_DOMANDE_PER_EDOARDO.md`, numerate 14–19. La domanda 9 di `16` (punti per euro) resta la prima: senza quella non si fa il motore dei punti.
