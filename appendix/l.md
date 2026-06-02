# L Extraction and evaluation details

This appendix collects various methodological details deferred from §2.3 and §4: how the off-policy trajectories used for concept-vector extraction are constructed (Appendix L.1), a check that the four final-move directions are balanced across the three terminal-tile classes (Appendix L.2), how the residual-stream layer is chosen for each of the four analyses that need one (steering, logit-lens, emotion scatter, tile-mean cosine), and the prompt and rollout counts per evaluation that feed the steering results of §4 (Table 26).

## L.1 Off-policy trajectory construction

We capture activations from “off-policy” programmatically-generated trajectories §2.3 for the purposes of concept vector extraction. We use this construction because it is the only way to guarantee that the only systematic difference between the three activation classes is the tile type of the final step.

Every time we extract concept vectors, we generate 5,000 trajectories per tile class ($\text{Mold}{}$, $\text{Gold}{}$, $\text{Path}{}$) for a total of 15,000 trajectories, distributed evenly across step counts $n \in \{1, \dots, 15\}$. Each trajectory uses its own freshly-generated maze. Mazes are produced by the same generator used in training (Appendix J), but with the different seed $\text{base\_seed}= 474747$ and incremented per maze for reproducibility.

Given a maze and target $(n, c)$ where $c \in \{\text{Mold}{}, \text{Gold}{}, \text{Path}{}\}$, we run a constrained random walk from the agent’s start position: the first $n-1$ steps choose uniformly among adjacent $\text{Path}{}$ tiles, and the final step is chosen to land on a tile of type $c$. If no such walk exists in a given maze, we discard it and draw a fresh maze. For $\text{Gold}{}$ trajectories with $n <$ optimal-path-length, or with mismatched parity, the maze is rejected immediately. The final trajectory is rendered into the same multi-turn chat format used at training time, with each turn an exchange of (user prompt describing the four adjacent tiles, assistant single-letter move in $\{\texttt{N}, \texttt{E}, \texttt{S}, \texttt{W}\}$).

Each formatted trajectory is tokenized under the model’s chat template, with no $\langle\!|\text{im\_end}|\!\rangle$ appended after the final assistant move. We capture at token position −1, the last direction letter the agent generated. We capture the residual stream at every transformer block at this position. The $\text{Mold}{}$ and $\text{Gold}{}$ concept vectors are then computed as the per-layer differences of class means, as in Equation 1.

## L.2 Class balance of the extracted trajectories

A potential confound is if e.g. $\text{Mold}{}$ trajectories disproportionately ended with `S` relative to $\text{Gold}{}$ trajectories, then $\mathbf{v}_{\text{Mold}}{}$ could partly encode the “the model just emitted `S`”.

We verify this is not the case:

| **Final tile** | $n$ | `N` | `E` | `S` | `W` |
| --- | --- | --- | --- | --- | --- |
| $\text{Mold}{}$ | 5000 | 24.54% | 25.10% | 25.38% | 24.98% |
| $\text{Gold}{}$ | 5000 | 24.70% | 24.52% | 25.52% | 25.26% |
| $\text{Path}{}$ | 5000 | 24.48% | 26.22% | 24.42% | 24.88% |
| overall | 15000 | 24.57% | 25.28% | 25.11% | 25.04% |

## Layer selection

We select layers in three different ways depending on the analysis. For concept-vector steering (sentiment, refusal, backtracking, calibration), we pick a single steering layer per (checkpoint, concept) pair from empirical separability metrics computed on held-out activations [33, 20]. For logit-lens unembedding and tile-mean geometry, we use depth-fraction heuristics ($\lfloor 5L/6 \rfloor$ and $\lfloor 2L/3 \rfloor$ respectively) consistent with prior findings on where high-level conceptual information is in the residual stream [21].

#### Steering layer.

Concept-vector extraction runs the trained agent on its tile-classification dataset and stores the difference of class means at every transformer block. With $L$ blocks and residual width $d$, this yields, for each concept $c \in \{\textsc{mold}, \textsc{gold}, \textsc{path}\}$ and checkpoint, per-layer concept vectors

$$
v^{(c)}_{\ell} \;=\; \mu^{(c,+)}_{\ell} - \mu^{(c,-)}_{\ell} \;\in\; \mathbb{R}^{d}, \qquad \mu^{(c,\pm)}_{\ell} \;=\; \frac{1}{|\mathcal{D}^{(c)}_{\pm}|}\sum_{x \in \mathcal{D}^{(c)}_\pm}h^{(\ell)}(x), \qquad \ell = 0, \dots, L{-}1,
$$

where $\mathcal{D}^{(c)}_{\pm}$ are the tiles labeled positive/negative for concept $c$ and $h^{(\ell)}$ is the residual stream at the output of block $\ell$. To choose a single $\ell^{\star}$ per concept we then project held-out positive and negative samples onto each candidate $v_{\ell}$, yielding two empirical 1-D distributions $\{s^{+}_{i,\ell}= \langle h^{(\ell)}(x^{+}_{i}), v_{\ell} \rangle\}_{i=1}^{n_+}$ and $\{s^{-}_{j,\ell}\}_{j=1}^{n_-}$, and compute three layer-wise scalars:

$$
\mathrm{AUROC}(\ell) \;=\; \Pr\!\bigl[s^{+}_{I,\ell}> s^{-}_{J,\ell}\bigr], \qquad d(\ell) \;=\; \frac{\bar s^{+}_{\ell} - \bar s^{-}_{\ell}}{s_{\text{pool},\ell}}, \qquad \mathrm{ovl}(\ell) \;=\; \sum_{b=1}^{B}\min\!\bigl(\hat p^{+}_{b}(\ell),\, \hat p^{-}_{b}(\ell)\bigr),
$$

where $s_{\text{pool},\ell}$ is the pooled standard deviation of the two projection samples (i.e. $d$ is Cohen’s $d$); $\mathrm{ovl}$ is the histogram overlap of cosine similarities $c^{\pm}_{i,\ell}= \langle h^{(\ell)}(x_{i}), v_{\ell} \rangle / (\|h^{(\ell)}(x_{i})\|\,\|v_{\ell}\|)$ binned into $B = 50$ bins on the joint range. We take the per-metric optima

$$
\ell^{\star}_{\mathrm{AUROC}}= \arg\max_{\ell} \mathrm{AUROC}(\ell), \qquad \ell^{\star}_{d} = \arg\max_{\ell} \lvert d(\ell) \rvert, \qquad \ell^{\star}_{\mathrm{ovl}}= \arg\min_{\ell} \mathrm{ovl}(\ell),
$$

and define the chosen layer as the floor of their unweighted mean,

$$
\ell^{\star} \;=\; \left\lfloor \tfrac{1}{3}\bigl(\ell^{\star}_{\mathrm{AUROC}}+ \ell^{\star}_{d} + \ell^{\star}_{\mathrm{ovl}}\bigr) \right\rfloor.
$$

Each (checkpoint, concept) pair receives its own $\ell^{\star}$; this is the layer used for every concept-vector steering evaluation. The precise choice of $\ell^{\star}$ is not very important: Appendix D verifies that sweeping $\ell$ over all 36 layers of the primary 4B Dr. GRPO checkpoint produces a wide band of layers ($\ell \in [17, 26]$) over which the steering effects of §4 still appear.

#### Logit-lens layer.

For logit-lens unembedding (§3.2 and Appendices F, B, C) we project each per-layer concept vector $v^{(c)}_{\ell}$ through the model’s unembedding matrix $W_{U} \in \mathbb{R}^{|V| \times d}$ to read off top-$k$ promoted and suppressed tokens, evaluated at a single depth-fraction layer

$$
\ell_{\mathrm{LL}}\;=\; \lfloor 5L/6 \rfloor.
$$

For Qwen3-4B and Qwen3-8B ($L = 36$) this gives layer 30; for GPT-OSS-20B ($L = 24$) it gives layer 20.

#### Emotion-scatter layer.

For the emotion projection analyses (§3.3 and Appendix C), we pick the joint-AUROC argmax

$$
\ell^{\star}_{\text{emo}}\;=\; \arg\max_{\ell}\, \tfrac{1}{2}\bigl(\mathrm{AUROC}^{\textsc{mold}}(\ell) + \mathrm{AUROC}^{\textsc{gold}}(\ell)\bigr).
$$

This yields $\ell = 21$ for Qwen3-4B-Instruct Dr. GRPO (LoRA), $\ell = 23$ for Qwen3-4B-Base, $\ell = 22$ for Qwen3-4B-Instruct Dr. GRPO FFT, and $\ell = 25$ for Qwen3-4B-Instruct SFT FFT. The same layer is reused for the maze-naive control scatters of Figure 18.

#### Tile-mean cosine layer.

For the tile-mean geometry in Appendix C we compute centered cosine similarities at a single per-model layer

$$
\ell_{\mathrm{TM}}\;=\; \lfloor 2L/3 \rfloor,
$$

giving layer 24 for $L = 36$ and layer 16 for $L = 24$. We pick a shallower depth than for the logit lens because this analysis targets cluster geometry in the residual stream rather than vocabulary readout.

For an evaluation of $n$ prompts with $k$ rollouts per prompt, each configuration of §4 collects $k \cdot n \cdot 5~\text{steering factors}\cdot 2~\text{concept vectors}$ rollouts. Control-vector ($\mathbf{u}_{\text{Mold}}{}$, $\mathbf{u}_{\text{Gold}}{}$) steering rollouts are shared across configurations whose maze-naive models are the same, so they are collected once per base model rather than once per configuration. We do not steer maze-trained checkpoints with control vectors. Per-evaluation prompt and generation counts are in Table 26.

**Table 26.** Prompt count $n$, generations per prompt $k$, and resulting per-configuration rollout total ($n \cdot k \cdot 5 \cdot 2$) for each of the four downstream steering evaluations of §4. The two confidence evaluations use a single $P(\text{True})$ probe per prompt per (factor, vector) cell rather than sampled generations, so we list $k = 1$.

| Evaluation | Dataset | $n$ | $k$ | Total/config |
| --- | --- | --- | --- | --- |
| Sentiment | 15 self-report + 25 emoji-association | 40 | 20 | 8,000 |
| Backtracking | GSM8K [7] | 200 | 10 | 20,000 |
| Confidence (SimpleQA) | SimpleQA-Verified [10] | 1,000 | 1 | 10,000 |
| Confidence (MMLU) | MMLU `high_school_*` [11] | 3,420 | 1 | 34,200 |
| Refusal | OR-Bench [8], 200 from each of 3 splits | 600 | 5 | 30,000 |
