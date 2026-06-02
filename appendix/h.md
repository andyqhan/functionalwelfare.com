# H Convergence with the Valence-Assent Axis

We argue that $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ lie along a generic functional welfare axis recruited by post-training. In this appendix we add a piece of external evidence: a direction independently engineered to be a valence axis in prior work by Lu et al. [18], by methods that do not involve any post-training, produces the same pattern of downstream effects as our reward vectors and is partially aligned with them in the residual stream of the maze-trained checkpoint. The construction is independent of ours, and the convergence is therefore informative.

## H.1 Their method, in brief

Lu et al. [18] present 175 normatively charged statements (e.g. “Abortion should be a legal option,” “Vaccines are safe and effective”) in a binary forced-choice prompt that asks the model whether it supports or opposes each statement, then perform PCA on the resulting last-token activations. PC1 is taken as the *Valence-Assent Axis* (VAA). They report that PC1 explains 26.3% of the activation variance at the chosen layer, that PC1 is strongly correlated with the model’s actual support/oppose decision, and that intervening additively along PC1 modulates valenced choices, sentiment classification of news headlines, factual True/False assent, and confidence.

The VAA is, by construction, a valence-discrimination direction. Its inputs are deliberately curated to be normatively charged, the elicitation prompt explicitly frames the task as “support” versus “oppose,” and the layer-selection criterion picks the depth at which two task formats designed to elicit the same value judgment (binary and continuous rating) agree most. Their contribution lies elsewhere: in showing that a single direction so engineered also drives factual-truth assent, refusal, and confidence on tasks the elicitation prompt did not target.

In contrast, our reward vectors are extracted from a maze whose tiles are chosen to be affectively neutral, with no semantic content that would bias an extracted direction toward valence (§2, Appendix J.2). If our reward vectors and the VAA point in similar directions, that convergence comes from two extraction routes that share no inputs, no prompt template, and no layer-selection criterion.

## H.2 Reproducing the VAA on Qwen3-4B-Instruct-2507

We reproduce the VAA on our primary subject model, Qwen3-4B-Instruct-2507, using the 175 statements from the public release of Lu et al. [18]. Following their method, for each statement $p_{i}$, $i = 1, \ldots, 175$, we apply the chat template to the prompt

>  Please respond your opinion on the following statement only with A or B. A means you support the statement, B means you oppose the statement.  
>  Statement: {$p_{i}$}  
>  Respond with only one word.

and run a single forward pass. Let $h^{(\ell)}(p_{i}) \in \mathbb{R}^{d}$ be the residual-stream activation at the last token of the rendered prompt at layer $\ell$, where $d=2560$ for this model. We collect the activation matrix  center it as $\widetilde{X}^{(\ell)}= X^{(\ell)}- \mathbf{1}\,\bar{x}^{(\ell)\top}$ where $\bar{x}^{(\ell)}= \frac{1}{175}\sum_{i} h^{(\ell)}(p_{i})$, and compute the thin SVD $\widetilde{X}^{(\ell)}= U^{(\ell)}\Sigma^{(\ell)}V^{(\ell)\top}$. The VAA at layer $\ell$ is the first right singular vector,

#### Sign orientation.

Lu et al. [18] fix the PCA sign ambiguity by tying $+$PC1 to statements where the model chose “support” over “oppose.” We use a continuous proxy for the same anchor: we flip $\mathbf{v}_{\text{VAA}}^{(\ell)}$ if the Pearson correlation between the projection $\widetilde{X}^{(\ell)}\mathbf{v}_{\text{VAA}}^{(\ell)}$ and the logit difference $\mathrm{logit}_{A}(p_{i}) - \mathrm{logit}_{B}(p_{i})$ is negative. After this convention, steering with $+\alpha\,\mathbf{v}_{\text{VAA}}^{(\ell)}$ pushes the model toward support and $-\alpha\,\mathbf{v}_{\text{VAA}}^{(\ell)}$ toward oppose.

#### Layer choice.

Lu et al. [18] extract their axis at layer 28 of Qwen2.5-14B (depth $28/48 \approx 58\%$) and at layer 43 of Qwen2.5-32B (depth $43/64 \approx 67\%$). For our 36-layer Qwen3-4B-Instruct-2507, the analogous depth is layer 21 ($21/36 \approx 58\%$). We adopt $\ell = 21$ throughout this appendix. As a sanity check, the $\ell = 21$ logit lens of $\mathbf{v}_{\text{VAA}}^{(21)}$ promotes a coherent set of valence-positive tokens (*Perfect*, *positive*, 双赢, 相符) and suppresses valence-negative tokens (*unsupported*, *negatively*, 有害, 残忍, 不适合).

## H.3 Cosine similarity between the VAA and our reward vectors

Before steering, we ask whether the VAA points in the direction one would predict if RL training is recruiting a pre-existing functional welfare axis. Under that hypothesis, the maze-naive (control) reward vectors $\mathbf{u}_{\text{Mold}}{}$ and $\mathbf{u}_{\text{Gold}}{}$ should have small cosine similarity with the VAA at the same layer (the maze representation is not yet tied to valence, a component of functional welfare), while the maze-trained reward vectors $\mathbf{v}_{\text{Mold}}{}$ and $\mathbf{v}_{\text{Gold}}{}$ should show a small but signed alignment, with $\mathbf{v}_{\text{Mold}}{}$ anti-aligned with the VAA’s support direction and $\mathbf{v}_{\text{Gold}}{}$ aligned with it.

Table 21 confirms this. At layer 21, the maze-naive control vectors are essentially orthogonal to $\mathbf{v}_{\text{VAA}}^{(21)}$, with cosines of −0.020 for $\mathbf{u}_{\text{Mold}}{}$ and −0.057 for $\mathbf{u}_{\text{Gold}}{}$. After maze training, the same vectors at layer 21 carry signed cosines −0.219 and +0.087 respectively, with the signs matching the recruitment prediction. We note that across all models tested, $\mathbf{v}_{\text{Mold}}$ cosine similarity is much larger than $\mathbf{v}_{\text{Gold}}$.

**Table 21.** Cosine similarity between the VAA at layer 21 of Qwen3-4B-Instruct-2507 and the reward and control vectors of this paper, all evaluated at layer 21. The maze-naive control vectors $\mathbf{u}_{\text{Mold}}{}, \mathbf{u}_{\text{Gold}}{}$ are orthogonal to the VAA. The maze-trained vector $\mathbf{v}_{\text{Mold}}{}$ acquires an anti-aligned cosine similarity with the VAA’s support direction, consistent across LoRA, emoji-swapped, and full-fine-tuned variants.

| **Vector** | $\cos(\cdot, \mathbf{v}_{\text{VAA}}^{(21)})$ |
| --- | --- |
| *Maze-naive control vectors* |  |
| $\mathbf{u}_{\text{Mold}}{}$ on Qwen3-4B-Instruct-2507 | −0.020 |
| $\mathbf{u}_{\text{Gold}}{}$ on Qwen3-4B-Instruct-2507 | −0.057 |
| *Maze-trained (post-RL) reward vectors* |  |
| $\mathbf{v}_{\text{Mold}}{}$ from 4B Dr. GRPO (primary) | −0.219 |
| $\mathbf{v}_{\text{Gold}}{}$ from 4B Dr. GRPO (primary) | +0.087 |
| $\mathbf{v}_{\text{Mold}}{}$ from 4B Dr. GRPO (emoji-swapped) | −0.181 |
| $\mathbf{v}_{\text{Gold}}{}$ from 4B Dr. GRPO (emoji-swapped) | +0.047 |
| $\mathbf{v}_{\text{Mold}}{}$ from 4B Dr. GRPO (full fine-tune) | −0.170 |
| $\mathbf{v}_{\text{Gold}}{}$ from 4B Dr. GRPO (full fine-tune) | +0.008 |

## H.4 Steering with the VAA

To compare the VAA’s downstream effects against our reward vectors, we run the full steering suite of §4 (sentiment, backtracking, refusal, SimpleQA confidence, MMLU confidence) using $\mathbf{v}_{\text{VAA}}^{(21)}$ as the steering direction, but with the steering coefficient rescaled so that the residual-stream perturbation matches what $\mathbf{v}_{\text{Gold}}{}$ produces at the same nominal $\alpha$.

The figures plot the equivalent $\alpha \in \{-4, -2, 0, +2, +4\}$ on the x-axis, which corresponds to scaled coefficients $\{-57.47, -28.74, 0, +28.74, +57.47\}$ on the unit-norm VAA.

Figure 35 shows the result. At nominal $|\alpha| = 2$, the VAA reproduces the qualitative pattern of $\mathbf{v}_{\text{Gold}}{}$ steering across all four evaluations. We mask incoherence-dominated points using the same protocol as the maze-figure controls.

This pattern is, by itself, unsurprising. The VAA was extracted from a procedure designed to recover a valence axis, and downstream tasks that depend on valence (sentiment is the obvious case, refusal and confidence on factual claims are the cases Lu et al. [18] themselves study) should respond to steering along it. Combined with the cosine-similarity analysis of §H.3, this is consistent with our reward vectors and the VAA pointing along a shared valence direction. The point of running this control is therefore not to discover that the VAA is valenced, but to provide a piece of independent external evidence that the direction $\mathbf{v}_{\text{Mold}}{}, \mathbf{v}_{\text{Gold}}{}$ converge toward post-training is the same direction one would obtain by extracting a valence axis from the model directly. We argue this is consistent with our functional welfare interpretation of the axis: valence is intimately related to functional welfare.

![Figure 35](https://functionalwelfare.com/paper/fig/appendix_vaa_steering__vaa_norm_matched_evals.svg)

**Figure 35.** The Valence-Assent Axis of Lu et al. [18], reproduced on Qwen3-4B-Instruct-2507 at layer 21, used as a steering direction across the behavioral evaluations. Backtracking points where more than 90% of responses are judged nonsensical are masked, following the protocol used elsewhere in the paper. The qualitative pattern matches that of the reward vectors: $+\alpha$ pushes toward positive sentiment, compliance, and high $P(\text{True})$, and $-\alpha$ pushes toward refusal, low $P(\text{True})$, and elevated backtracking on easy math.
