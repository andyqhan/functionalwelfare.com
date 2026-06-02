# D Layer sweep: steering effects across the residual stream

Every steering result in the body of this paper, and in Appendix A, intervenes at a single layer $\ell^{\star}$ chosen per (checkpoint, concept) pair by the data-driven AUROC/Cohen’s $d$/overlap heuristic of Appendix L. A natural worry is that this single-layer choice cherry-picks the layer at which the effect is largest. This appendix rules that out for the primary 4B Dr. GRPO checkpoint by re-running every steering evaluation at every $\ell$.

We find that the effect exists in a wide band of late-middle layers rather than at a single point, that the band has a consistent sign for each (concept, evaluation) pair, and that our layer-selection algorithm does not pick the peak of the band. The numbers we report in the body of the paper are therefore not the most dramatic results available; they are instead representative points within a robust band.

## D.1 Setup

We restrict the sweep to the primary checkpoint (Qwen3-4B-Instruct-2507 Dr. GRPO) and to the maze-naive-steered condition. The vectors $\mathbf{v}_{\text{Mold}}{}$ and $\mathbf{v}_{\text{Gold}}{}$ are extracted as in §2, with the per-layer collection from Appendix L.

#### Steering at every layer.

For a fixed concept $c \in \{\text{Mold}{}, \text{Gold}{}\}$, recall that the per-layer concept vector is the difference of class means at the output of block $\ell$,  exactly as in Equation 7 of Appendix L. The body of the paper evaluates only $v^{(c)}_{\ell^\star}$. Here we evaluate all $L = 36$ layers. For each layer $\ell$, we steer the maze-naive base model by adding $\alpha\,v^{(c)}_{\ell}$ to the residual stream at the output of block $\ell$ on every assistant-turn token,  and observe the behavior.

#### Reduced steering grid.

Sweeping all $L$ layers multiplies the cost of the body’s steering experiments by $L$, so we cut the body’s grids by a constant factor while keeping their structure. We drop the $\alpha = 0$ evaluation and use $\alpha \in \{-4, -2, +2, +4\}$. We also subsample the prompt sets used in each downstream evaluation:

- **Sentiment.** 24 prompts (12 welfare self-reports and 12 maze-tile associations, sampled from the 40-prompt set of Appendix N.1) and $k = 5$ rollouts per prompt. Total $24 \cdot 5 \cdot 4 \cdot 2 = 960$ rollouts per layer.
- **Backtracking.** 50 GSM8K problems (a stratified sample of the 200 used in the body) and $k = 4$ rollouts per prompt. Total $50 \cdot 4 \cdot 4 \cdot 2 = 1{,}600$ rollouts per layer.
- **Refusal.** 40 prompts from each of the three OR-Bench splits (easy, hard, harmful), 120 total, with $k = 3$ rollouts per prompt. Total $120 \cdot 3 \cdot 4 \cdot 2 = 2{,}880$ rollouts per layer.
- **Confidence (SimpleQA-Verified).** 200 questions stratified by topic (out of the 1000 used in the body). Because candidate answer generation is layer- and $\alpha$-independent, we re-use the cached unsteered answers from the body’s evaluation and only re-run the steered $P(\text{True})$ probe.
- **Confidence (MMLU).** 700 questions stratified by subject (out of the 3,420 used in the body), with the same answer-cache reuse.

For each concept and each layer $\ell$, all four evaluations are judged with the same Qwen3-8B judge used in the body.

#### Per-cell summary statistic.

For a single (concept $c$, evaluation $e$, layer $\ell$) cell we have $|\mathcal{P}_{e}|$ prompts $\times\,k_{e}$ rollouts $\times\,4$ steering factors of behavior measurements. Let $y_{p,r}^{(c,e,\ell,\alpha)}$ be the metric for prompt $p$, rollout $r$, at steering factor $\alpha$ (sentiment score on $[-5, +5]$ for sentiment, indicator of judge-classified backtracking for backtracking, indicator of refusal for refusal, $P(\text{True}) / (P(\text{True}) + P(\text{False}))$ for the confidence evaluations). We pool the per-rollout observations into a single ordinary least squares fit,  and report the slope $\widehat{\beta}_{1}^{(c,e,\ell)}$ as the cell’s value. The diverging color in Figures 22 and 23 encodes this slope on the same scale across both concepts. In prose we use the shorthand  Standard errors of $\widehat{\beta}_{1}^{(c,e,\ell)}$ from the OLS fit are uniformly small, on the order of 0.01–0.05 in the units of each metric, so we omit them from the figures. The two cells with the largest stderr are $\mathrm{slope}^{(\text{Mold}{}, \text{Sentiment})}(\ell = 22)$ at $\pm 0.04$ on a slope of −0.65 and $\mathrm{slope}^{(\text{Gold}{}, \text{Sentiment})}(\ell = 22)$ at $\pm 0.04$ on a slope of +0.71.

## D.2 Results

![Figure 22](https://functionalwelfare.com/paper/fig/appendix_layer_sweep__layer_sweep_heatmap_lava.svg)

**Figure 22.** Per-layer steering slope $\mathrm{slope}^{(\text{Mold}{}, e)}(\ell)$ for $\mathbf{v}_{\text{Mold}}{}$ on the primary 4B Dr. GRPO checkpoint, maze-naive-steered. Rows index transformer layer (0 at top, 35 at bottom); columns index downstream evaluation. Color encodes the OLS slope of the metric against $\alpha$ pooled over prompts and rollouts (Equation 6); a positive slope (red) means the metric increases as we add more $\mathbf{v}_{\text{Mold}}{}$, and a negative slope (blue) means it decreases. The black box highlights the layer $\ell^{\star} = 20$ chosen by the AUROC/Cohen’s $d$/overlap heuristic of Appendix L.

![Figure 23](https://functionalwelfare.com/paper/fig/appendix_layer_sweep__layer_sweep_heatmap_goal.svg)

**Figure 23.** Per-layer steering slope for $\mathbf{v}_{\text{Gold}}{}$ on the primary 4B Dr. GRPO checkpoint, maze-naive-steered. Layout and color scale match Figure 22. The signs are reversed for every evaluation, consistent with the antiparallelism of $\mathbf{v}_{\text{Mold}}{}$ and $\mathbf{v}_{\text{Gold}}{}$ (Appendix C). The black box highlights the layer $\ell^{\star} = 22$ chosen by the same heuristic.

Across all four evaluations and both concepts, the layers with detectable signed slope cluster between $\ell = 17$ and $\ell = 26$, roughly the upper half of the late-middle third of the model. Within that band the sign is consistent across all four evaluations: $\mathbf{v}_{\text{Mold}}{}$ steering produces negative sentiment slope, positive backtracking and refusal slopes, and negative $P(\text{True})$ slopes, while $\mathbf{v}_{\text{Gold}}{}$ produces the mirror image. Outside this band, slopes are essentially flat.

The selected layers $\ell^{\star}_{\text{Mold}}{}= 20$ and $\ell^{\star}_{\text{Gold}}{}= 22$ are within $\pm 2$ of the layer with the largest absolute slope in every (concept, evaluation) cell. They are not the maximum: in fact the absolute-slope peak across all ten cells is at $\ell = 22$ or $\ell = 23$. For $\mathbf{v}_{\text{Gold}}$ the selected layer happens to be the peak in three of the table’s five rows (sentiment, SimpleQA, MMLU) and is one layer away in the other two (backtracking and refusal). For $\mathbf{v}_{\text{Mold}}$ the selected layer is uniformly two layers shallower than the per-evaluation peak. This is a consequence of our layer selection heuristic optimizing for class separability of activations rather than for behavioral effects. We emphasize that the selection therefore does not cherry-pick: we report results at a layer that is not the layer at which our effects are strongest.

#### Summary table.

**Table 11.** Top three layers by absolute slope per (concept, evaluation) cell, alongside the slope at the AUROC/Cohen’s $d$/overlap-selected layer ( $\ell^{\star}_{\text{Mold}} = 20$, $\ell^{\star}_{\text{Gold}} = 22$ ) and its distance to the per-cell peak. Across all ten cells, the selected layer is within two layers of the peak; in three of ten the selected layer is the peak itself.

| Concept | Evaluation | Top-3 layers (slope) | Slope at $\ell^{\star}$ | Peak distance |
| --- | --- | --- | --- | --- |
| $\mathbf{v}_{\text{Mold}}$ ($\ell^{\star} = 20$) | Sentiment | $L_{22}(-0.65),\,L_{23}(-0.50),\,L_{24}(-0.39)$ | −0.23 | 2 |
|  | Backtracking | $L_{22}(+0.16),\,L_{23}(+0.14),\,L_{21}(+0.13)$ | +0.10 | 2 |
|  | Refusal | $L_{22}(+0.08),\,L_{23}(+0.07),\,L_{24}(+0.05)$ | +0.03 | 2 |
|  | Conf. SimpleQA | $L_{22}(-0.15),\,L_{23}(-0.15),\,L_{21}(-0.14)$ | −0.13 | 2 |
|  | Conf. MMLU | $L_{22}(-0.15),\,L_{23}(-0.15),\,L_{24}(-0.13)$ | −0.12 | 2 |
| $\mathbf{v}_{\text{Gold}}$ ($\ell^{\star} = 22$) | Sentiment | $L_{22}(+0.71),\,L_{23}(+0.56),\,L_{20}(+0.37)$ | +0.71 | 0 |
|  | Backtracking | $L_{23}(-0.14),\,L_{24}(-0.10),\,L_{22}(-0.08)$ | −0.08 | 1 |
|  | Refusal | $L_{23}(-0.07),\,L_{24}(-0.04),\,L_{22}(-0.04)$ | −0.04 | 1 |
|  | Conf. SimpleQA | $L_{22}(+0.15),\,L_{23}(+0.15),\,L_{20}(+0.13)$ | +0.15 | 0 |
|  | Conf. MMLU | $L_{22}(+0.15),\,L_{23}(+0.13),\,L_{24}(+0.12)$ | +0.15 | 0 |
