# J Details of the maze environment

This appendix collects the training-environment details deferred from §2.1: how mazes are laid out and generated (Appendix J.1), why we picked the particular emoji we use (Appendix J.2), the north-direction bias and the equalized entropy bonus that mitigates it (Appendix J.3), and descriptions of the wind mechanic (Appendix J.4), Path-tile melting (Appendix J.4), and prompt shuffling (Appendix J.4).

## J.1 Maze layout and generation

Mazes are $100 \times 100$ grids whose outer ring is Mold, generated fresh on every rollout so no two episodes share a map. Generation initializes the interior to all Mold, then runs a random walk from a uniformly chosen interior cell for between $5 \times 98$ and $15 \times 98$ steps, converting each visited cell to Path. If the resulting interior is more than 50% Mold, random Mold cells are flipped to Path until the interior Mold fraction is in $[10\%, 50\%)$. The goal count is $\max(1, \lfloor 0.20 \, n \rfloor)$, where $n$ is the number of interior Mold cells, and Gold tiles are placed on uniformly chosen Path cells; denser mazes therefore carry proportionally more reward. The starting position is the Path cell nearest the grid center under breadth-first search.

The interior is $98 \times 98$, so with 15-step trajectories the agent cannot reach the Mold border.

## J.2 Emoji are fraught with meaning: selection and neutrality

If the tile emoji came pre-loaded with sentiment, the downstream effects we attribute to maze training could be inherited from pre-training rather than recruited. We claim that the Mold/Gold/Path emoji are affectively neutral, i.e. that the maze-naive model does not already associate them with sentiment. In this appendix, we describe how we chose the emoji we used.

#### The dessert trio was not neutral.

Our initial choice was a dessert trio (cupcake for Mold, donuts for Path, ice cream for Gold), on the theory that semantically similar items would be close together in representation space. They did not. When we extracted concept vectors for each emoji from the maze-naive model and steered with them, the cupcake vector already produced more negative judged sentiment than the ice-cream vector. Qwen appears to simply not like cupcakes as much as it likes donuts or ice cream.

![Figure 39](https://functionalwelfare.com/paper/fig/appendix_emoji__scatter_desserts_qwen3_4b_instruct.svg)

**Figure 39.** Sentiment landscape for all $\sim 4000$ emoji on the maze-naive Qwen3-4B-Instruct-2507, with the dessert trio highlighted. Each point is one emoji’s concept vector; the axes are its cosine similarity with two independently extracted sentiment concept vectors (CAD-derived and prompt-based). While the three dessert emoji are close along the CAD axis, cupcake lags substantially on the prompt axis.

#### Searching for a neutral trio.

To find a replacement, we extracted sentiment concept vectors two independent ways (see Appendix F), projected every emoji’s concept vector onto both axes, and searched for themed trios whose within-trio spread (max $-$ min on each axis) was near zero. The *office* trio (card index, triangular ruler, receipt) came out tightly clustered near the origin on both methods. However, the rolodex emoji 🗂 is still slightly off-center on the CAD axis (which we have empirically confirmed is less predictive of sentiment effects in steering than the Prompt vector). To control for this, we train the emoji-swapped models.

![Figure 40](https://functionalwelfare.com/paper/fig/appendix_emoji__scatter_office_qwen3_4b_instruct.svg)

**Figure 40.** Same scatter as Figure 39, with the *office* trio highlighted. The three office emoji are very close to each other.

**Table 22.** Per-emoji cosine similarity with each sentiment concept vector, plus the within-trio spread (max $-$ min), for the two trios we seriously considered. The office trio is an order of magnitude tighter than the dessert trio on the prompt axis. While the rolodex is shifted along the CAD axis, the prompt method is a better predictor of downstream sentiment judging (validated below) and the absolute magnitude of the offset is negligible.

| Trio | Emoji | cos(CAD) | cos(prompt) |
| --- | --- | --- | --- |
| desserts | 🧁 MOLD tile (cupcake) | +0.145 | +0.129 |
|  | 🍩 PATH tile (donut) | +0.167 | +0.260 |
|  | 🍨 GOLD tile (ice cream) | +0.142 | +0.274 |
| *desserts spread* | *max $-$ min* | *0.024* | *0.145* |
| office | 🗂 MOLD tile (rolodex) | +0.056 | +0.008 |
|  | 🧾 PATH tile (receipt) | +0.076 | +0.005 |
|  | 📐 GOLD tile (triangular ruler) | +0.075 | +0.011 |
| *office spread* | *max $-$ min* | *0.020* | *0.006* |

### The office emoji are neutral in steered sentiment judging

What ultimately matters is not the cosine similarity with the sentiment vectors but the downstream effect on the full steering-sentiment evaluation. Here, the static measure predicts the dynamic behavior well: steering the maze-naive model with concept vectors extracted from each of the three office emoji produces essentially flat sentiment across the whole $\alpha$ range.

![Figure 41](https://functionalwelfare.com/paper/fig/appendix_emoji__predictive_check_office.svg)

**Figure 41.** Steered sentiment on the maze-naive model vs. steering factor $\alpha$, for concept vectors extracted from each of the three office emoji’s maze trajectories. The static cosine-similarity measure used to pick the trio predicts the downstream steering effect; steered sentiment is nearly flat across $\alpha$, so these emoji do not confound our sentiment-judge pipeline.

### The extremes of the emoji sentiment ranking

For reference, Tables 23 and 24 report the top-20 most-positive and top-20 most-negative emoji according to the CAD sentiment vector on Qwen3-4B-Instruct-2507.

**Table 23.** Top-20 most positive emoji by cosine similarity with the CAD sentiment vector on Qwen3-4B-Instruct-2507.

| Rank | Emoji | Name | cos(CAD) / cos(prompt) |
| --- | --- | --- | --- |
| 1 | 🌻 | sunflower | +0.194 / +0.306 |
| 2 | 🌸 | cherry blossom | +0.191 / +0.318 |
| 3 | 🌼 | blossom | +0.191 / +0.304 |
| 4 | 💫 | dizzy | +0.189 / +0.168 |
| 5 | 🎅🏾 | Santa Claus medium dark skin tone | +0.187 / +0.266 |
| 6 | 🌺 | hibiscus | +0.187 / +0.326 |
| 7 | 🌷 | tulip | +0.186 / +0.296 |
| 8 | 🧡 | orange heart | +0.180 / +0.156 |
| 9 | 💏🏾 | kiss medium dark skin tone | +0.180 / +0.182 |
| 10 | 🍒 | cherries | +0.179 / +0.204 |
| 11 | 💏🏽 | kiss medium skin tone | +0.177 / +0.227 |
| 12 | 🌹 | rose | +0.177 / +0.267 |
| 13 | ✨ | sparkles | +0.177 / +0.120 |
| 14 | 💐 | bouquet | +0.177 / +0.273 |
| 15 | 🌈 | rainbow | +0.176 / +0.279 |
| 16 | 🌟 | glowing star | +0.176 / +0.126 |
| 17 | 👋🏾 | waving hand medium dark skin tone | +0.175 / +0.175 |
| 18 | 🐻 | bear | +0.173 / +0.254 |
| 19 | 🙏🏻 | folded hands light skin tone | +0.173 / +0.233 |
| 20 | 💪🏾 | flexed biceps medium dark skin tone | +0.173 / +0.220 |

**Table 24.** Top-20 most negative emoji by cosine similarity with the CAD sentiment vector on Qwen3-4B-Instruct-2507.

| Rank | Emoji | Name | cos(CAD) / cos(prompt) |
| --- | --- | --- | --- |
| 1 | 🇺🇳 | United Nations | -0.180 / -0.252 |
| 2 | 🇮🇴 | British Indian Ocean Territory | -0.179 / -0.248 |
| 3 | 🇬🇶 | Equatorial Guinea | -0.173 / -0.182 |
| 4 | 🇦🇨 | Ascension Island | -0.172 / -0.213 |
| 5 | 👨‍🦽‍➡ | man in manual wheelchair facing right | -0.163 / -0.182 |
| 6 | 👨‍🦼‍➡ | man in motorized wheelchair facing right | -0.162 / -0.249 |
| 7 | 🇬🇵 | Guadeloupe | -0.162 / -0.190 |
| 8 | 👨🏾‍🦯‍➡ | man with white cane facing right medium dark skin tone | -0.160 / -0.236 |
| 9 | 👨🏼‍🦼‍➡ | man in motorized wheelchair facing right medium light skin tone | -0.158 / -0.229 |
| 10 | 👰🏾‍♂ | man with veil medium dark skin tone | -0.157 / -0.254 |
| 11 | 👨🏼‍🦯‍➡ | man with white cane facing right medium light skin tone | -0.156 / -0.212 |
| 12 | 🙅🏾‍♀ | woman gesturing NO medium dark skin tone | -0.156 / -0.131 |
| 13 | 🇺🇲 | U.S. Outlying Islands | -0.153 / -0.171 |
| 14 | 👨🏾‍🦼‍➡ | man in motorized wheelchair facing right medium dark skin tone | -0.153 / -0.243 |
| 15 | 🇸🇽 | Sint Maarten | -0.152 / -0.180 |
| 16 | 👨🏽‍🦼‍➡ | man in motorized wheelchair facing right medium skin tone | -0.148 / -0.203 |
| 17 | 👨🏻‍🦼‍➡ | man in motorized wheelchair facing right light skin tone | -0.148 / -0.231 |
| 18 | ✖ | multiply | -0.147 / -0.339 |
| 19 | 👰🏼‍♂ | man with veil medium light skin tone | -0.146 / -0.174 |
| 20 | 👨🏽‍🦯‍➡ | man with white cane facing right medium skin tone | -0.146 / -0.186 |

## J.3 Low-entropy agents and the equalized entropy bonus

We discovered that even before maze training, Qwen3-4B-Instruct-2507 is nearly deterministic over the four action tokens $\{\texttt{N}, \texttt{E}, \texttt{S}, \texttt{W}\}$. This is why we apply the *equalized entropy bonus* referenced in §2.1: without it, the policy collapses to a single direction before the reward signal can shape the representation.

### Definition of the equalized entropy bonus

Standard PPO/GRPO entropy regularizers add $H(\pi(\cdot \mid s))$ over the full four-action distribution and pull the policy toward uniformity over $\{\texttt{N}, \texttt{E}, \texttt{S}, \texttt{W}\}$. In our setting that is actively harmful: the four directions point at qualitatively different tiles, and we want the policy to put high mass on Gold and low mass on Mold. We instead encourage uniformity within each tile-type equivalence class.

At step $t$, let the agent’s four neighbors be indexed by $a \in \{N, E, S, W\}$ with tile types $\tau(a, t) \in \{\text{Path}{}, \text{Mold}{}, \text{Gold}{}\}$, and let $\boldsymbol{\ell}(t) \in \mathbb{R}^{4}$ be the model’s logits restricted to those four direction tokens. For each type $c$, let $S_{c}(t) = \{a : \tau(a, t) = c\}$ and $k_{c}(t) = |S_{c}(t)|$. When $k_{c}(t) \geq 2$, define the within-class softmax and its Shannon entropy

$$
\pi^{(c)}_{a}(t) = \frac{\exp \ell_{a}(t)}{\sum_{a' \in S_c(t)}\exp \ell_{a'}(t)}, \qquad H_{c}(t) = -\!\!\sum_{a \in S_c(t)}\pi^{(c)}_{a}(t) \log \pi^{(c)}_{a}(t);
$$

when $k_{c}(t) < 2$, set $H_{c}(t) = 0$. The per-step equalized entropy is

$$
H_{\text{eq}}(t) = \!\!\!\sum_{c \in \{\text{Path}{},\,\text{Mold}{},\,\text{Gold}{}\}}\!\!\! H_{c}(t),
$$

bounded above by $\sum_{c} \log k_{c}(t)$. Note that $H_{\text{eq}}$ can exceed the standard four-action cap $\log 4 \approx 1.386$: within-class uniformity for several types at once does not require uniformity over all four actions.

Per response, $H_{\text{eq}}(t)$ is masked to direction-emission positions and aggregated across the rollout batch with the Dr. GRPO “seq-mean-token-sum” normalization (loss-scale factor $Z = 2048$). The bonus is added to the loss with a negative sign so that maximizing $H_{\text{eq}}$ minimizes loss:

$$
\mathcal{L}= \mathcal{L}_{\text{PG}}+ \kappa\,\mathcal{L}_{\text{KL}}- \beta(s)\,\bar{H}_{\text{eq}}.
$$

The coefficient is cosine-annealed, $\beta(s) = \beta_{0} \cdot \tfrac{1}{2}(1 + \cos(\pi p(s)))$ with $p(s) = \min(s / (S - 1) \cdot f,\,1)$, $S = 500$ steps, and decay-speed $f = 1$. The same multiplier scales the learning rate. Per-run $\beta_{0}$ is listed under “Ent.” in Table 28.

The tile-type tensor is captured before the move resolves, since tile melting mutates $\tau$ from one turn to the next.

### The maze-naive model almost always picks `N`

When the maze-naive model is given prompts whose four neighbors are all the same tile type, it places essentially all probability mass on `N`, and nothing on the other three actions. The bias is robust to swapping tile emoji (*office*, *swapped*, letters-as-tiles), which rules out emoji-specific explanations.

Entropy also collapses over the course of a trajectory. By turn 2 or 3 the trained model has locked in extremely confident action predictions; the maze-naive model starts confident and only gets more so.

![Figure 42](https://functionalwelfare.com/paper/fig/appendix_entropy__b1_entropy_by_turn.svg)

**Figure 42.** Per-turn action entropy for the maze-naive model vs. the maze-trained model, averaged over a batch of trajectories. Both models are very low-entropy; the trained model is even more confident than the base model.

### Which mitigations work

We tried several mitigations, including changing the ordering of the directions in the prompt (which we use in final training runs; see Appendix J.4) and switching from cardinal directions (`N`, `E`, `S`, `W`) to relative directions (up, right, down, left). Direction shuffling helps but is not sufficient on its own; it was also necessary to apply the equalized entropy bonus to the RL loss.

The equalized entropy bonus carries its own risk. If the coefficient is too high, it overwhelms the Dr. GRPO advantage and the agent stops optimizing for reward. We kept it at 0.01 for the primary Qwen3-4B-Instruct run, tuned empirically.

## J.4 Wind, tile melting, prompt-shuffling

In this section, we describe additional features of the maze environment.

#### J.4 Wind.

If the maze agents perfectly learn to avoid Mold, this would mean that choosing to go into Mold would become out-of-distribution. Ten percent of the time, we ignore the chosen move of the model, and instead randomly sample one of the four directions. It is possible for the wind to blow in the same direction that the model chose, in which case the model moves two tiles in that direction. We inform the model that wind has happened in the prompt. Two consecutive turns of a trajectory in which the wind overrides the agent’s chosen action:

> _Turn 1._
>
> **Response:** User: You are in a maze. Currently, you’re at location $(4, 7)$. To the north there is Mold; to the east there is Path; to the south there is Path; to the west there is Path. Where do you move? Output only N/E/S/W without punctuation. Assistant: `W`
>
> _Turn 2 (wind has blown the agent south)._
>
> **Response:** User: *A strong wind from the North blew you South!* You are in a maze. Currently, you’re at location $(4, 8)$. To the north there is Mold[^1]; to the east there is Path; to the south there is Path; to the west there is Gold. Where do you move? Output only N/E/S/W without punctuation.

#### J.4 Tile melting.

Although we punish Path visits at -0.1 to prevent trivial oscillation, we continued to observe agents oscillating between two tiles. We therefore implement a mechanic where the previous tile becomes Mold after a move (including Gold tiles, to prevent trivial reward consumption, and including when the move was forced by wind).

#### J.4 Prompt-shuffling.

As discussed in Appendix J.3, we observed that the agents have low entropy over direction tokens. To partially mitigate this, we shuffle the order of the directions provided in the prompt (“to the north there is…”), but do not shuffle the final instruction (“output only N/E/S/W without punctuation”).

[^1]: The previous Path tile has “melted” into Mold; see the next paragraph.
