# F Sentiment and emotion-valence vectors are not functional welfare vectors

A concern about our results is that the reward vectors are simply known valence directions in the residual stream rather than something distinctively about functional welfare (though it would still be interesting that known valence directions would be recruited by this affectively neutral environment). We test this against three independently-extracted candidates: two sentiment vectors (§§F.1–F.3) and the first principal component of the emotion concept vectors (§F.4). Both modulate three of the four steering behaviors but fail on math backtracking. Projecting the sentiment subspace out of $\mathbf{v}_{\text{Gold}}$ leaves a residual that recovers backtracking with full strength (§F.5). Backtracking therefore distinguishes our axis from these alternatives.

## F.1 How we extract the sentiment vectors

Both sentiment vectors are extracted from Qwen3-4B-Instruct-2507 (the maze-naive version of our primary subject) by computing a difference of mean residual-stream activations at layers {20, 21, 22, 23}, captured at the final token position of a chat-formatted prompt. (Steering and emotion-cosine evaluations use layer 22 alone.) The two methods differ only in how the positive and negative activation distributions are constructed.

#### CAD method.

We use the Counterfactually Augmented IMDB sentiment dataset [15, 19], in which each review has a hand-edited counterfactual flipping its sentiment. Each review is wrapped in the classifier-style template

>  Text: {review}$\backslash$n$\backslash$nQuestion: Is the overall sentiment of the text positive or negative?

and run through the model. We collect last-token activations for all positive reviews and all negative reviews, take the per-class mean, and define the CAD sentiment vector as $\mu_{\text{positive}}- \mu_{\text{negative}}$ at each target layer.

#### Prompt method.

The Prompt method uses just two contrasting prompts:

>  “Describe a book using positive sentiment”   
>  “Describe a book using negative sentiment”

We run each through the model and define the Prompt sentiment vector as the difference of the two final-token activations at each target layer. There is no averaging over a dataset.

The two methods agree closely on which axis they extract: both place *happy/blissful/content/cheerful*-style emotions at the positive end and *hateful/scornful/angry/frustrated*-style emotions at the negative end (Tables 14, 15; cross-extraction scatter, Figure 26).

## F.2 Cosine similarity with the sentiment vectors

We compare the reward vectors (and the baseline control vectors) to each sentiment vector using cosine similarity.

![Figure 24](https://functionalwelfare.com/paper/fig/cosine_similarity.svg)

**Figure 24.** Cosine similarity of Mold and Gold concept vectors with two sentiment-specific concept vectors, with maze-naive controls and annotations at the largest deviations, at layers 20–23.

Before maze training (grayed-out lines), maze-trajectory concept vectors are essentially orthogonal to the sentiment vectors. After maze training, the concept vectors shift clearly in the positive direction (for Gold) or the negative direction (for Mold). The alignment is non-trivial but also imperfect, maxing out at magnitude $\sim 0.2$; this is initial evidence that the vectors are more than sentiment.

## F.3 Evaluating the sentiment vectors

We take each sentiment vector and put it through the same evaluation suite as for the reward vectors, and see whether it reproduces the steering pattern. We do so for both the CAD and Prompt vectors. Note that the “positive” and “negative” logit lens from the CAD vector is an artifact of how it was extracted.

**Table 13.** Logit lens for the two independently-extracted sentiment concept vectors on Qwen3-4B-Instruct Dr. GRPO. Compare with the first row of Table 4: these are much more obviously about sentiment.

| Vector | Layer | Top 5 Promoted | Top 5 Suppressed |
| --- | --- | --- | --- |
| Sentiment (CAD) | 30 | ␣positively   ␣positives   Positive   ␣Positive   ␣positive | ␣negative   ␣Negative   Negative   负 (negative)   negative |
| Sentiment (Prompt) | 30 | ␣joyful   喜悦 (joy)   !↵↵   温暖 (warm)   ␣joy | ␣Worse   ␣unacceptable   惨 (miserable)   丑 (ugly)   恶心 (disgusting) |

#### Emotion concept basis.

We computed the analog of Figure 3, projecting 171 emotion concept vectors onto the (Mold, sentiment) plane separately for each extraction method.

![Figure 25](https://functionalwelfare.com/paper/fig/appendix_sentiment_steering__emotion_scatter_cad.svg)

![Figure 25](https://functionalwelfare.com/paper/fig/appendix_sentiment_steering__emotion_scatter_prompt.svg)

**Figure 25.** Cosine similarity of 171 emotion concept vectors with the Mold vector (x-axis) and each sentiment vector (y-axis) at layer 22 of Qwen3-4B-Instruct Dr. GRPO. *Left*: CAD-extracted sentiment vector. *Right*: Prompt-extracted sentiment vector. Across both panels: **Blue labels** are most similar to the y-axis sentiment vector (y-axis); **red labels** are most similar to $\mathbf{v}_{\text{Mold}}$ (x-axis); **black labels** are closest to the origin; green labels are most deviant from the best-fit line.

While the sentiment vectors reproduce the general shape of the $\mathbf{v}_{c}$, a line with negative slope and extremal emotions corresponding to valence, we note that the best-fit lines are much steeper here, and that for the Prompt vector, the magnitude of cosine similarity is greater.

**Table 14.** Emotions most and least aligned with the Sentiment (CAD) concept vector at layer 22 of 4B Dr. GRPO.

| Top sentiment similar | Bottom sentiment similar |
| --- | --- |
| happy (+0.260) | hateful (−0.227) |
| optimistic (+0.257) | scornful (−0.225) |
| blissful (+0.257) | angry (−0.223) |
| content (+0.247) | frustrated (−0.218) |
| cheerful (+0.245) | bitter (−0.217) |

**Table 15.** Emotions most and least aligned with the Sentiment (Prompt) concept vector at layer 22 of 4B Dr. GRPO.

| Top sentiment similar | Bottom sentiment similar |
| --- | --- |
| blissful (+0.371) | disdainful (−0.345) |
| happy (+0.362) | scornful (−0.330) |
| joyful (+0.332) | hateful (−0.323) |
| pleased (+0.332) | frustrated (−0.318) |
| delighted (+0.324) | bitter (−0.315) |

#### Cross-extraction agreement.

The CAD and Prompt vectors are not identical, but they are not arbitrary either. Plotting cosines of all 171 emotion concepts against both sentiment vectors simultaneously (Figure 26) yields a tight linear cluster: emotions that load positively on CAD also load positively on Prompt, with a similarly tight negative tail. In other words, the two extraction methods recover the same ranking of emotions along the sentiment axis.

![Figure 26](https://functionalwelfare.com/paper/fig/appendix_sentiment_steering__emotion_scatter_cad_vs_prompt.svg)

**Figure 26.** Cross-extraction agreement: cosine similarity of each of the 171 emotion concept vectors with the Sentiment (CAD) vector (x-axis) versus the Sentiment (Prompt) vector (y-axis), at layer 22 of Qwen3-4B-Instruct Dr. GRPO. The two extraction methods rank emotions consistently along the same axis, with the Prompt vector inducing a larger spread. **Blue labels** are most similar to the Sentiment (Prompt) vector (y-axis); **red labels** are most similar to the Sentiment (CAD) vector (x-axis); **black labels** are closest to the origin; green labels are most deviant from the best-fit line.

#### Behavioral steering.

Running both sentiment vectors through the full steering evaluation suite (sentiment, GSM8K backtracking, OR-Bench refusal, P(True) on SimpleQA and MMLU) over $\alpha \in \{-4, -2, 0, +2, +4\}$ yields the plot in Figure 27. We use the same assistant-only steering protocol used for the reward vectors (§4).

![Figure 27](https://functionalwelfare.com/paper/fig/appendix_sentiment_steering__combined_evals.svg)

**Figure 27.** Both sentiment vectors run through the steering evaluations on Qwen3-4B-Instruct Dr. GRPO. The CAD vector (green) and Prompt vector (red) largely reproduce the sentiment, refusal, and confidence patterns of the $\mathbf{v}_{\text{Mold}}$/$\mathbf{v}_{\text{Gold}}$ vectors but fail on backtracking. Compare each panel with the corresponding Mold/Gold plots in the main text.

Both sentiment vectors largely reproduce three of the four behavioral signatures (sentiment, refusal, and confidence), in the same direction as the Mold/Gold vectors, though with slightly different timbres. However, neither vector reproduces the math-backtracking pattern.

#### Orthogonal emotions.

For completeness we include the emotions most orthogonal to the (Mold, sentiment) pair for each extraction method.

**Table 16.** Most orthogonal emotions to mold/sentiment (CAD) vectors at layer 22 of 4B Dr. GRPO (values: $\cos_{\text{Mold}{}}$, $\cos_{\text{CAD}}$).

| Emotion | Emotion |
| --- | --- |
| lonely (−0.004, −0.007) | sympathetic (−0.028, −0.002) |
| lazy (+0.008, +0.014) | aroused (−0.028, +0.024) |
| reflective (−0.005, −0.018) | awestruck (−0.038, +0.001) |
| sleepy (−0.016, −0.015) | stimulated (−0.044, +0.004) |
| indifferent (−0.025, −0.013) | bored (+0.028, −0.036) |

**Table 17.** Most orthogonal emotions to mold/sentiment (Prompt) vectors at layer 22 of 4B Dr. GRPO (values: $\cos_{\text{Mold}{}}$, $\cos_{\text{Prompt}}$).

| Emotion | Emotion |
| --- | --- |
| lonely (−0.004, −0.015) | sleepy (−0.016, −0.052) |
| reflective (−0.005, −0.015) | melancholy (+0.005, −0.063) |
| lazy (+0.008, −0.043) | sad (+0.012, −0.062) |
| indifferent (−0.025, −0.045) | surprised (+0.033, −0.056) |
| sympathetic (−0.028, +0.043) | envious (+0.063, +0.020) |

## F.4 The emotion-valence principal component

We present results of principal components analyses on the extracted emotion concepts. We validate that, following prior work, PC1 captures emotion concepts’ valence. We then project reward and control vectors onto PC1 and PC2, and finally use PC1 itself as a steering vector through the full evaluation suite.

Following the methodology in the concurrent Sofroniew et al. [25], we run PCA on the 171 emotion concept vectors extracted from Qwen3-4B-Instruct-2507 and Qwen3-4B-Base at every layer. Then we compute the loading of the maze-trained Mold and Gold vectors onto PC1, and pick the layer that maximizes the trained-minus-control PC1 loading. For both models, this happens at layer 28. Figures 28 and 29 plot each emotion concept’s PC1 and PC2 coordinate as a bar, with horizontal lines marking the PC1/PC2 coordinate of six maze trajectory vectors from our primary model and its emoji-swapped control $\mathbf{v}_{\text{Mold}}$/$\mathbf{v}_{\text{Gold}}$ from the primary, $\mathbf{v}_{\text{Mold}}$/$\mathbf{v}_{\text{Gold}}$ from the emoji-swap, the maze-naive control vectors $\mathbf{u}_{\text{Mold}}$/$\mathbf{u}_{\text{Gold}}$ with the normal emoji configuration, and $\mathbf{u}_{\text{Mold}}$/$\mathbf{u}_{\text{Gold}}$ with emojis swapped.

Our results agree with the other work: PC1 appears to capture valence, and PC2 appears to capture arousal. $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ project onto opposite ends of the PC1 axis. PC2 shows little separation between them. $\mathbf{u}_{\text{Mold}}$ and $\mathbf{u}_{\text{Gold}}$ do not load onto either principal component. Tile-swap controls behave like the corresponding non-swap condition, confirming that the PC1 separation does not depend on emoji choice.

The projection is imperfect: $\mathbf{v}_{\text{Gold}}$’s projection onto PC1 is not near the maximum projection of an emotion concept onto that axis, as expected, as $\mathbf{v}_{\text{Mold}}$ and $\mathbf{v}_{\text{Gold}}$ are not merely emotional valence.

![Figure 28](https://functionalwelfare.com/paper/fig/appendix_emotion_pca_steering__emotion_pca_reward_projection_instruct.svg)

**Figure 28.** Qwen3-4B-Instruct-2507. PC1 (top) and PC2 (bottom) of the 171 emotion concept vectors at layer 28, with reward and control vectors annotated as horizontal lines. Layer 28 is the argmax of PC1(trained) $-$ PC1(control) across the 36-layer sweep.

![Figure 29](https://functionalwelfare.com/paper/fig/appendix_emotion_pca_steering__emotion_pca_reward_projection_base.svg)

**Figure 29.** Same as Figure 28 for Qwen3-4B-Base at layer 28.

#### Logit lens.

Projecting PC1 at layer 28 through the unembedding of Qwen3-4B-Instruct-2507 surfaces emotion-adjective tokens at both ends, in the same genre as the dedicated sentiment vectors above (Table 13) and unlike the failure/completion tokens of the reward vectors (first row of Table 4).

#### Steering setup.

We use the PC1 at layer 28 and rescale it to the L2 norm of $\mathbf{v}_{\text{Gold}}$ at layer 28. Note that the norm of $\mathbf{v}_{\text{Gold}}$ at layer 28 is about twice as large as its norm at the $\ell^{*}$ we use in the rest of the paper. We err on the side of over-steering rather than under-steering.

The cosine similarity between the PC1 and $\mathbf{v}_{\text{Gold}}$ at layer 28 is only +0.12, which already predicts that PC1 captures only a small fraction of $\mathbf{v}_{\text{Gold}}$’s direction. The steering result below is consistent with that: PC1 modulates the same downstream behaviors as the reward vectors, but not with the same shape: we observe no backtracking, and little effect on confidence when steering negatively; we also observe weak sentiment and refusal effects.

**Table 18.** Logit lens for the emotion-PCA PC1 vector at layer 28 of Qwen3-4B-Instruct-2507. Compare with the first row of Table 4 (reward vectors) and Table 13 (dedicated sentiment vectors): the promoted/suppressed tokens are emotion-adjective endpoints, not the failure/completion tokens of the reward vectors.

| Vector | Layer | Top 5 Promoted | Top 5 Suppressed |
| --- | --- | --- | --- |
| Emotion PC1 | 28 | 从容 (calmly)   很开心 (very happy)   欣喜 (delighted)   很高兴 (very happy)   惊喜 (surprise) | ␣Worse   惨 (miserable)   ␣worse   噩 (startling)   残酷 (cruel) |

![Figure 30](https://functionalwelfare.com/paper/fig/appendix_emotion_pca_steering__pc1_steering_evals.svg)

**Figure 30.** Emotion PC1 (extracted at layer 28 from Qwen3-4B-Instruct-2507) evaluated across the steering evaluations. PC1 is scaled to the L28 norm of $\mathbf{v}_{\text{Gold}}$.

## F.5 The non-sentiment residual of $\mathbf{v}_{\text{Gold}}$ drives backtracking

We have shown that $\mathbf{v}_{\text{Gold}}$ and the two sentiment vectors are correlated but distinct (§F.2), and that sentiment steering reproduces three of $\mathbf{v}_{\text{Gold}}$’s four downstream effects but fails on math backtracking (§F.3). Backtracking therefore most differentiates $\mathbf{v}_{\text{Gold}}$ from sentiment. If we project the sentiment subspace out of $\mathbf{v}_{\text{Gold}}$ entirely, does the residual still drive backtracking? If yes, the part of the welfare axis that is genuinely not sentiment is by itself sufficient to recover the load-bearing behavior.

#### Construction.

Let $\mathbf{v}_{\text{cad}}$ and $\mathbf{v}_{\text{prompt}}$ denote the two sentiment vectors at layer $\ell^{*} = 22$ (§F.1), and let $S = \mathrm{span}(\mathbf{v}_{\text{cad}}, \mathbf{v}_{\text{prompt}}) \subset \mathbb{R}^{2560}$. We orthogonally project $\mathbf{v}_{\text{Gold}}$ (computed at the same layer via Equation 1) onto the orthogonal complement of $S$:  where $\mathrm{proj}_{S}$ is computed by Gram–Schmidt on $\{\mathbf{v}_{\text{cad}}, \mathbf{v}_{\text{prompt}}\}$, giving an orthonormal basis $\{\mathbf{e}_{1}, \mathbf{e}_{2}\}$ of $S$ and $\mathrm{proj}_{S}(\mathbf{v}_{\text{Gold}}{}) = (\mathbf{v}_{\text{Gold}}{}\cdot \mathbf{e}_{1})\mathbf{e}_{1} + (\mathbf{v}_{\text{Gold}}{}\cdot \mathbf{e}_{2})\mathbf{e}_{2}$. We then norm-match $\mathbf{r}$ to $\mathbf{v}_{\text{Gold}}{}$ so that comparisons at the same steering factor $\alpha$ are at equal $\ell_{2}$-magnitude:  By construction, $\mathbf{v}_{\text{eval}}\perp \mathbf{v}_{\text{cad}}$ and $\mathbf{v}_{\text{eval}}\perp \mathbf{v}_{\text{prompt}}$.

#### Behavioral steering.

We run $\mathbf{v}_{\text{eval}}$ through the same steering evaluations, on the same trained 4B Dr. GRPO checkpoint, at $\alpha \in \{-4, -2, -1, +2, +4\}$. Figure 31 plots all four vectors on the same axes for each evaluation.

![Figure 31](https://functionalwelfare.com/paper/fig/appendix_sentiment_residual__combined_evals.svg)

**Figure 31.** Steering with the sentiment-residualized vector $\mathbf{v}_{\text{eval}}$ (purple, solid) compared to $\mathbf{v}_{\text{Gold}}$, the CAD sentiment vector, and the Prompt sentiment vector (dotted), on Qwen3-4B-Instruct Dr. GRPO at layer 22, across the full evaluation suite. By construction $\mathbf{v}_{\text{eval}}$ is orthogonal to both sentiment vectors. On math backtracking, it exceeds $\mathbf{v}_{\text{Gold}}$.

$\mathbf{v}_{\text{eval}}$ drives backtracking: the part of $\mathbf{v}_{\text{Gold}}$ lying in the orthogonal complement of the sentiment subspace is sufficient, by itself, to recover and slightly exceed $\mathbf{v}_{\text{Gold}}$’s backtracking effect.

We note that $\mathbf{v}_{\text{eval}}$ not only drives backtracking, but does so even stronger than $\mathbf{v}_{\text{Gold}}$. At a given $\alpha$, the sentiment-subspace component of $\mathbf{v}_{\text{Gold}}$ contributes nothing to backtracking, since neither sentiment vector drives backtracking in isolation. Projecting that component out removes signal that did no useful work for this behavior. The norm-matching step then concentrates the same magnitude of perturbation entirely on the remaining direction, so each unit of $\alpha$ buys slightly more displacement along the backtracking-driving direction than under raw $\mathbf{v}_{\text{Gold}}$.

On sentiment, refusal, and calibration, $\mathbf{v}_{\text{eval}}$ reproduces $\mathbf{v}_{\text{Gold}}$’s effects with similar magnitude and direction; the sentiment vectors also modulate these three behaviors. We interpret this to mean that several distinct directions in this layer of the residual stream individually carry signal that modulates each of sentiment, refusal, and calibration. $\mathbf{v}_{\text{Gold}}$ is one such direction, $\mathbf{v}_{\text{cad}}$ and $\mathbf{v}_{\text{prompt}}$ are others, and $\mathbf{v}_{\text{eval}}$ is yet another. Removing the sentiment-subspace component of $\mathbf{v}_{\text{Gold}}$ leaves a vector that still lies in this broader collection of valence-loaded directions, which is why the three non-backtracking behaviors remain. Backtracking is the behavior with the narrowest set of effective directions: sentiment-subspace directions are not in it, but $\mathbf{v}_{\text{eval}}$ is.

#### Geometric analyses.

Logit-lens unembedding of $\mathbf{v}_{\text{eval}}$ at layer 22 (Table 19) is similar to that of $\mathbf{v}_{\text{Gold}}$ at the same layer. Projection of the 171 emotion concept vectors onto $\mathbf{v}_{\text{eval}}$ retains the valence ordering (Table 20). This is further evidence that there is a wide “cone” of sentiment- or valence-related directions.

**Table 19.** Logit-lens top-10 promoted and suppressed tokens for $\mathbf{v}_{\text{eval}}$ at layer 22 of Qwen3-4B-Instruct Dr. GRPO, with logit values in parentheses. Compare with the corresponding $\mathbf{v}_{\text{Gold}}$ entry in the first row of Table 4 (and the full top-20 list in Appendix B.1, Table 5).

| Top 10 Promoted | Top 10 Suppressed |
| --- | --- |
| ␣stun (+1.374) | issing (−1.520) |
| ␣Aster (+1.289) | 愚 (stupid) (−1.408) |
| 出动 (dispatch) (+1.250) | 或是 (or) (−1.381) |
| amu (+1.227) | 次要 (secondary) (−1.380) |
| -pe (+1.224) | 回购 (repurchase) (−1.375) |
| 到位 (in place) (+1.197) | 都不是 (none) (−1.358) |
| 辦 (do) (+1.193) | 都不敢 (don’t even dare) (−1.300) |
| 巴斯 (bath) (+1.188) | 都没有 (none) (−1.288) |
| -object (+1.188) | 徒 (only) (−1.275) |
| Het (+1.186) | 女装 (women’s clothing) (−1.270) |

**Table 20.** Top, middle, and bottom 10 emotion concept vectors ranked by cosine similarity with $\mathbf{v}_{\text{eval}}$ at layer 22 of Qwen3-4B-Instruct Dr. GRPO. Although $\mathbf{v}_{\text{eval}}$ is constructed to be orthogonal to both sentiment vectors, it still places valenced emotions at the extremes.

| Top 10 | Middle 10 | Bottom 10 |
| --- | --- | --- |
| inspired (+0.120) | greedy (−0.017) | self-conscious (−0.087) |
| loving (+0.091) | indifferent (−0.018) | dependent (−0.087) |
| valiant (+0.090) | heartbroken (−0.019) | offended (−0.088) |
| fulfilled (+0.088) | grief-stricken (−0.020) | mortified (−0.089) |
| kind (+0.087) | tired (−0.020) | annoyed (−0.091) |
| hopeful (+0.086) | stubborn (−0.020) | disdainful (−0.093) |
| hope (+0.085) | vengeful (−0.021) | resentful (−0.096) |
| proud (+0.085) | troubled (−0.024) | humiliated (−0.100) |
| blissful (+0.083) | grumpy (−0.024) | embarrassed (−0.110) |
| thankful (+0.081) | surprised (−0.025) | ashamed (−0.110) |

![Figure 32](https://functionalwelfare.com/paper/fig/appendix_sentiment_residual__emotion_pc1_projection.svg)

**Figure 32.** Projection of $\mathbf{v}_{\text{eval}}$, $\mathbf{v}_{\text{Gold}}$, and the two sentiment vectors onto PC1 of the 171 emotion concept vectors at layer 22 of Qwen3-4B-Instruct Dr. GRPO. $\mathbf{v}_{\text{eval}}$ retains positive PC1 alignment despite being orthogonal to both sentiment vectors, at roughly 60% of $\mathbf{v}_{\text{Gold}}$’s magnitude.
