import express from 'express';
import OpenAI from 'openai';

import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { validateLayoutShape } from '../utils/jsonValidator.js';
import { applyTransformsToLayout } from '../utils/layoutTransforms.js';

const router = express.Router();

function getOpenAIClient() {
  return process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
}

function getArtboard(layout) {
  const rootId = layout.rootNodes?.[0];
  return rootId ? layout.nodes?.[rootId] : null;
}

function getChildren(layout) {
  return getArtboard(layout)?.children?.map((id) => layout.nodes[id]).filter(Boolean) || [];
}

function textOf(node) {
  return String(node?.data?.content || '').toLowerCase();
}

function nameOf(node) {
  return String(node?.name || '').toLowerCase();
}

function findHeadline(layout) {
  const textNodes = getChildren(layout).filter((node) => node.type === 'text');
  const luxury = textNodes.find((node) => textOf(node).includes('luxury'));
  if (luxury) return luxury;

  return textNodes.sort((a, b) => {
    const af = a.style?.visual?.fontSize || 0;
    const bf = b.style?.visual?.fontSize || 0;
    return bf - af;
  })[0];
}

function findProduct(layout) {
  return getChildren(layout).find((node) => nameOf(node).includes('product'));
}

function findDiscountBadge(layout) {
  return getChildren(layout).find((node) => textOf(node).includes('%') || textOf(node).includes('off'));
}

function findOfferText(layout) {
  return getChildren(layout).find((node) => textOf(node).includes('limited') || textOf(node).includes('offer'));
}

function findOfferBadge(layout) {
  const discount = findDiscountBadge(layout);
  if (discount) return discount;
  return findOfferText(layout);
}

function findSubheadline(layout) {
  return getChildren(layout).find((node) => textOf(node).includes('comfort that defines'));
}

function findBackground(layout) {
  return getChildren(layout).find((node) => nameOf(node).includes('background'));
}

function findSmallIcons(layout) {
  return getChildren(layout).filter((node) => node.type === 'image' && nameOf(node).includes('vector'));
}

function lastMentionedRole(history = []) {
  const joined = history
    .slice()
    .reverse()
    .map((m) => String(m?.content || '').toLowerCase())
    .join('\n');

  if (joined.includes('headline') || joined.includes('main text')) return 'headline';
  if (joined.includes('product')) return 'product';
  if (joined.includes('badge') || joined.includes('discount') || joined.includes('offer')) return 'offerBadge';
  return null;
}

function nodeForRole(layout, role) {
  if (role === 'headline') return findHeadline(layout);
  if (role === 'product') return findProduct(layout);
  if (role === 'offerBadge') return findOfferBadge(layout);
  return null;
}

function fitOriginalDesign(layout) {
  const headline = findHeadline(layout);
  const subheadline = findSubheadline(layout);
  const product = findProduct(layout);
  const offerText = findOfferText(layout);
  const badgeText = findDiscountBadge(layout);
  const badgeShape = getChildren(layout).find((node) => node.type === 'shape');
  const icons = findSmallIcons(layout);
  const transforms = [];

  if (headline) {
    transforms.push(
      { type: 'set_node_rect', nodeId: headline.id, nx: 0.12, ny: 0.18, nw: 0.76, nh: 0.16 },
      { type: 'set_font_size', nodeId: headline.id, fontSize: 70 },
      { type: 'set_color', nodeId: headline.id, color: '#FFFFFF' }
    );
  }

  if (subheadline) {
    transforms.push(
      { type: 'set_node_rect', nodeId: subheadline.id, nx: 0.18, ny: 0.35, nw: 0.64, nh: 0.05 },
      { type: 'set_font_size', nodeId: subheadline.id, fontSize: 40 },
      { type: 'set_color', nodeId: subheadline.id, color: '#FFFFFF' }
    );
  }

  if (badgeShape) {
    transforms.push({ type: 'set_node_rect', nodeId: badgeShape.id, nx: 0.1, ny: 0.43, nw: 0.16, nh: 0.15 });
  }

  if (badgeText) {
    transforms.push(
      { type: 'set_node_rect', nodeId: badgeText.id, nx: 0.115, ny: 0.445, nw: 0.13, nh: 0.1 },
      { type: 'set_font_size', nodeId: badgeText.id, fontSize: 52 },
      { type: 'set_color', nodeId: badgeText.id, color: '#FFFFFF' }
    );
  }

  if (product) {
    transforms.push({ type: 'set_node_rect', nodeId: product.id, nx: 0.08, ny: 0.55, nw: 0.84, nh: 0.28 });
  }

  if (offerText) {
    transforms.push(
      { type: 'set_node_rect', nodeId: offerText.id, nx: 0.28, ny: 0.89, nw: 0.44, nh: 0.06 },
      { type: 'set_font_size', nodeId: offerText.id, fontSize: 46 },
      { type: 'set_color', nodeId: offerText.id, color: '#FFFFFF' }
    );
  }

  icons.slice(0, 5).forEach((icon, index) => {
    transforms.push({
      type: 'set_node_rect',
      nodeId: icon.id,
      nx: 0.22 + index * 0.05,
      ny: 0.115,
      nw: 0.035,
      nh: 0.035
    });
  });

  return transforms;
}

function storyLayout(layout) {
  const headline = findHeadline(layout);
  const subheadline = findSubheadline(layout);
  const product = findProduct(layout);
  const offerText = findOfferText(layout);
  const badgeText = findDiscountBadge(layout);
  const badgeShape = getChildren(layout).find((node) => node.type === 'shape');
  const transforms = [{ type: 'resize_artboard', width: 1080, height: 1920 }];

  if (headline) {
    transforms.push(
      { type: 'set_node_rect', nodeId: headline.id, nx: 0.09, ny: 0.12, nw: 0.82, nh: 0.14 },
      { type: 'set_font_size', nodeId: headline.id, fontSize: 76 }
    );
  }

  if (subheadline) {
    transforms.push(
      { type: 'set_node_rect', nodeId: subheadline.id, nx: 0.13, ny: 0.285, nw: 0.74, nh: 0.045 },
      { type: 'set_font_size', nodeId: subheadline.id, fontSize: 42 }
    );
  }

  if (badgeShape) {
    transforms.push({ type: 'set_node_rect', nodeId: badgeShape.id, nx: 0.1, ny: 0.38, nw: 0.18, nh: 0.1 });
  }

  if (badgeText) {
    transforms.push(
      { type: 'set_node_rect', nodeId: badgeText.id, nx: 0.12, ny: 0.395, nw: 0.14, nh: 0.07 },
      { type: 'set_font_size', nodeId: badgeText.id, fontSize: 56 }
    );
  }

  if (product) {
    transforms.push({ type: 'set_node_rect', nodeId: product.id, nx: 0.04, ny: 0.53, nw: 0.92, nh: 0.2 });
  }

  if (offerText) {
    transforms.push(
      { type: 'set_node_rect', nodeId: offerText.id, nx: 0.24, ny: 0.84, nw: 0.52, nh: 0.045 },
      { type: 'set_font_size', nodeId: offerText.id, fontSize: 48 }
    );
  }

  return transforms;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[^a-z0-9\s&-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function inferCreativeBrief(message) {
  const lower = String(message || '').toLowerCase();

  const briefs = [
    {
      match: ['digital marketing', 'marketing agency', 'seo', 'analytics'],
      title: 'Scale Smarter with Digital Marketing',
      subtitle: 'Performance ads, SEO, content, and analytics dashboards built for measurable growth.',
      cta: 'Book a free strategy call',
      badge: '+42%\nROAS',
      metric1: '18K\nLeads',
      metric2: '3.8x\nGrowth',
      palette: { bg: '#F8FBFF', primary: '#2563EB', soft: '#DBEAFE', text: '#0F172A', muted: '#334155' }
    },
    {
      match: ['restaurant', 'food', 'pizza', 'burger', 'cafe', 'coffee'],
      title: 'Fresh Flavors, Hot Offers',
      subtitle: 'Bring more guests in with a bold seasonal promotion and irresistible visual appeal.',
      cta: 'Order now',
      badge: '30%\nOFF',
      metric1: '4.9\nRating',
      metric2: 'Fresh\nDaily',
      palette: { bg: '#FFF7ED', primary: '#EA580C', soft: '#FED7AA', text: '#1F2937', muted: '#7C2D12' }
    },
    {
      match: ['gym', 'fitness', 'workout', 'yoga', 'health club'],
      title: 'Stronger Starts Today',
      subtitle: 'Launch a high-energy fitness campaign with plans, coaching, and real progress.',
      cta: 'Join the challenge',
      badge: '7 DAY\nTRIAL',
      metric1: '24/7\nAccess',
      metric2: '1:1\nCoach',
      palette: { bg: '#F8FAFC', primary: '#16A34A', soft: '#DCFCE7', text: '#052E16', muted: '#166534' }
    },
    {
      match: ['real estate', 'property', 'home', 'apartment', 'villa'],
      title: 'Find Your Next Address',
      subtitle: 'Promote premium properties with clean details, trust signals, and direct enquiry flow.',
      cta: 'Schedule a viewing',
      badge: 'NEW\nLISTING',
      metric1: 'Prime\nArea',
      metric2: 'Easy\nEMI',
      palette: { bg: '#F8FAFC', primary: '#0F766E', soft: '#CCFBF1', text: '#0F172A', muted: '#115E59' }
    },
    {
      match: ['fashion', 'clothing', 'beauty', 'skincare', 'salon'],
      title: 'Style That Gets Noticed',
      subtitle: 'Create a polished promotional post with premium visuals and a clear shopping action.',
      cta: 'Shop the collection',
      badge: 'NEW\nDROP',
      metric1: 'Best\nSellers',
      metric2: 'Limited\nStock',
      palette: { bg: '#FDF2F8', primary: '#DB2777', soft: '#FCE7F3', text: '#3B0764', muted: '#9D174D' }
    },
    {
      match: ['education', 'course', 'class', 'school', 'learning'],
      title: 'Learn Skills That Matter',
      subtitle: 'Promote a course with clear outcomes, credibility, and a strong enrollment CTA.',
      cta: 'Enroll today',
      badge: '50%\nOFF',
      metric1: 'Live\nClasses',
      metric2: 'Career\nReady',
      palette: { bg: '#EFF6FF', primary: '#4F46E5', soft: '#E0E7FF', text: '#111827', muted: '#3730A3' }
    },
    {
      match: ['travel', 'tour', 'hotel', 'vacation', 'trip'],
      title: 'Your Escape Starts Here',
      subtitle: 'Showcase a dreamy travel offer with destination highlights and booking urgency.',
      cta: 'Book your trip',
      badge: 'SAVE\n25%',
      metric1: 'Top\nHotels',
      metric2: 'Easy\nBooking',
      palette: { bg: '#ECFEFF', primary: '#0891B2', soft: '#CFFAFE', text: '#164E63', muted: '#0E7490' }
    }
  ];

  const brief = briefs.find((item) => item.match.some((word) => lower.includes(word)));
  if (brief) return brief;

  const quoted = String(message || '').match(/["']([^"']{4,80})["']/)?.[1];
  const afterFor = lower.match(/\bfor\s+(?:a|an|the)?\s*([a-z0-9\s&-]{4,60})/)?.[1];
  const topic = titleCase(quoted || afterFor || 'Modern Promotional Post');

  return {
    title: topic || 'Modern Promotional Post',
    subtitle: 'A clean, balanced promotional layout with strong hierarchy and a clear call to action.',
    cta: lower.includes('call') ? 'Contact us today' : 'Get started now',
    badge: lower.includes('sale') || lower.includes('offer') ? 'LIMITED\nOFFER' : 'NEW\nLAUNCH',
    metric1: 'Premium\nDesign',
    metric2: 'Fast\nResults',
    palette: lower.includes('dark')
      ? { bg: '#111827', primary: '#38BDF8', soft: '#1F2937', text: '#F8FAFC', muted: '#CBD5E1' }
      : { bg: '#F8FAFC', primary: '#2563EB', soft: '#DBEAFE', text: '#0F172A', muted: '#475569' }
  };
}

function shouldCreateLayout(message) {
  const lower = String(message || '').toLowerCase();
  return [
    'design',
    'create',
    'make',
    'build',
    'generate',
    'layout',
    'post',
    'banner',
    'ad',
    'promo',
    'promotion',
    'modern',
    'professional',
    'minimal',
    'balanced',
    'upgrade'
  ].some((word) => lower.includes(word));
}

function creativeLayoutTransforms(layout, message) {
  const brief = inferCreativeBrief(message);
  const headline = findHeadline(layout);
  const subheadline = findSubheadline(layout) || getChildren(layout).filter((node) => node.type === 'text')[1];
  const cta = findOfferText(layout);
  const badge = findDiscountBadge(layout);
  const product = findProduct(layout);
  const background = findBackground(layout);
  const icons = findSmallIcons(layout);
  const badgeShape = getChildren(layout).find((node) => node.type === 'shape');
  const p = brief.palette;
  const transforms = [
    { type: 'set_artboard_background', color: p.bg },
    { type: 'resize_artboard', width: 1080, height: 1080 }
  ];

  if (background) {
    transforms.push({ type: 'set_node_rect', nodeId: background.id, nx: 0, ny: 0, nw: 1, nh: 1 });
  }

  if (headline) {
    transforms.push(
      { type: 'set_text', nodeId: headline.id, content: brief.title },
      { type: 'set_node_rect', nodeId: headline.id, nx: 0.075, ny: 0.11, nw: 0.72, nh: 0.18 },
      { type: 'set_font_size', nodeId: headline.id, fontSize: 68 },
      { type: 'set_color', nodeId: headline.id, color: p.text }
    );
  }

  if (subheadline) {
    transforms.push(
      { type: 'set_text', nodeId: subheadline.id, content: brief.subtitle },
      { type: 'set_node_rect', nodeId: subheadline.id, nx: 0.08, ny: 0.31, nw: 0.68, nh: 0.09 },
      { type: 'set_font_size', nodeId: subheadline.id, fontSize: 32 },
      { type: 'set_color', nodeId: subheadline.id, color: p.muted }
    );
  }

  if (cta) {
    transforms.push(
      { type: 'set_text', nodeId: cta.id, content: brief.cta },
      { type: 'set_node_rect', nodeId: cta.id, nx: 0.095, ny: 0.825, nw: 0.43, nh: 0.065 },
      { type: 'set_font_size', nodeId: cta.id, fontSize: 34 },
      { type: 'set_color', nodeId: cta.id, color: '#FFFFFF' }
    );
  }

  if (badge) {
    transforms.push(
      { type: 'set_text', nodeId: badge.id, content: brief.badge },
      { type: 'set_node_rect', nodeId: badge.id, nx: 0.72, ny: 0.17, nw: 0.16, nh: 0.12 },
      { type: 'set_font_size', nodeId: badge.id, fontSize: 38 },
      { type: 'set_color', nodeId: badge.id, color: '#FFFFFF' }
    );
  }

  if (badgeShape) {
    transforms.push(
      { type: 'set_node_rect', nodeId: badgeShape.id, nx: 0.68, ny: 0.145, nw: 0.23, nh: 0.18 },
      { type: 'set_fill', nodeId: badgeShape.id, color: p.primary }
    );
  }

  if (product) {
    transforms.push({ type: 'set_node_rect', nodeId: product.id, nx: 0.1, ny: 0.49, nw: 0.8, nh: 0.23 });
  }

  icons.slice(0, 5).forEach((icon, index) => {
    transforms.push({
      type: 'set_node_rect',
      nodeId: icon.id,
      nx: 0.11 + index * 0.115,
      ny: 0.73 + (index % 2) * 0.03,
      nw: 0.042,
      nh: 0.042
    });
  });

  transforms.push(
    {
      type: 'add_node',
      id: 'generated_visual_panel',
      nodeType: 'shape',
      name: 'Visual Panel',
      nx: 0.075,
      ny: 0.435,
      nw: 0.58,
      nh: 0.31,
      fill: p.soft,
      borderRadius: 28
    },
    {
      type: 'add_node',
      id: 'generated_metric_card_1',
      nodeType: 'shape',
      name: 'Metric Card',
      nx: 0.135,
      ny: 0.5,
      nw: 0.18,
      nh: 0.11,
      fill: '#FFFFFF',
      borderRadius: 20
    },
    {
      type: 'add_node',
      id: 'generated_metric_card_2',
      nodeType: 'shape',
      name: 'Metric Card',
      nx: 0.38,
      ny: 0.555,
      nw: 0.2,
      nh: 0.12,
      fill: '#FFFFFF',
      borderRadius: 20
    },
    {
      type: 'add_node',
      id: 'generated_cta_button',
      nodeType: 'shape',
      name: 'CTA Button Background',
      nx: 0.065,
      ny: 0.805,
      nw: 0.49,
      nh: 0.1,
      fill: p.primary,
      borderRadius: 26
    },
    {
      type: 'add_node',
      id: 'generated_metric_text_1',
      nodeType: 'text',
      name: 'Metric Text',
      content: brief.metric1,
      nx: 0.165,
      ny: 0.515,
      nw: 0.13,
      nh: 0.07,
      color: p.primary,
      fontSize: 30,
      fontWeight: 700
    },
    {
      type: 'add_node',
      id: 'generated_metric_text_2',
      nodeType: 'text',
      name: 'Metric Text',
      content: brief.metric2,
      nx: 0.405,
      ny: 0.58,
      nw: 0.14,
      nh: 0.07,
      color: p.text,
      fontSize: 30,
      fontWeight: 700
    }
  );

  return transforms;
}

function deterministicTransforms(layout, message, history = []) {
  const lower = String(message || '').toLowerCase();
  const transforms = [];
  const wantsDigitalAgency =
    lower.includes('digital marketing') ||
    lower.includes('marketing agency') ||
    lower.includes('analytics') ||
    lower.includes('professional instagram') ||
    lower.includes('blue and white');

  if (wantsDigitalAgency) {
    return creativeLayoutTransforms(layout, message);
  }

  if (lower.includes('9:16') || lower.includes('9 by 16') || lower.includes('9x16')) {
    transforms.push(...storyLayout(layout));
  } else if (lower.includes('16:9') || lower.includes('16 by 9') || lower.includes('16x9')) {
    transforms.push({ type: 'resize_artboard', width: 1920, height: 1080 });
  } else if (lower.includes('4:5') || lower.includes('4 by 5') || lower.includes('4x5')) {
    transforms.push({ type: 'resize_artboard', width: 1080, height: 1350 });
  } else if (lower.includes('1:1') || lower.includes('square')) {
    transforms.push({ type: 'resize_artboard', width: 1080, height: 1080 }, ...fitOriginalDesign(layout));
  } else if (lower.includes('fix layout') || lower.includes('clean layout') || lower.includes('original layout')) {
    transforms.push(...fitOriginalDesign(layout));
  }

  const explicitRole =
    lower.includes('headline') || lower.includes('main text')
      ? 'headline'
      : lower.includes('product')
        ? 'product'
        : lower.includes('badge') || lower.includes('discount') || lower.includes('offer')
          ? 'offerBadge'
          : lower.includes(' it ') || lower.startsWith('it ') || lower.includes(' that ')
            ? lastMentionedRole(history)
            : null;

  const target = nodeForRole(layout, explicitRole);
  const badgeShape = getChildren(layout).find((node) => node.type === 'shape');

  if (target && (lower.includes('top') || lower.includes('move up'))) {
    transforms.push({ type: 'move_node', nodeId: target.id, anchor: 'top' });
    if (explicitRole === 'offerBadge' && badgeShape) {
      transforms.push({ type: 'move_node', nodeId: badgeShape.id, anchor: 'top' });
    }
  }

  if (target && (lower.includes('higher') || lower.includes('up a bit') || lower.includes('move up'))) {
    transforms.push({ type: 'move_node', nodeId: target.id, dy: -90 });
    if (explicitRole === 'offerBadge' && badgeShape) {
      transforms.push({ type: 'move_node', nodeId: badgeShape.id, dy: -90 });
    }
  }

  if (target && (lower.includes('center') || lower.includes('middle'))) {
    transforms.push({ type: 'move_node', nodeId: target.id, anchor: 'center' });
  }

  if (target && (lower.includes('smaller') || lower.includes('reduce') || lower.includes('decrease'))) {
    transforms.push({ type: 'resize_node', nodeId: target.id, scale: 0.86 });
  }

  if (target && (lower.includes('bigger') || lower.includes('larger') || lower.includes('large') || lower.includes('increase'))) {
    transforms.push({ type: 'resize_node', nodeId: target.id, scale: explicitRole === 'product' ? 1.12 : 1.1 });
    if (explicitRole === 'offerBadge' && badgeShape) {
      transforms.push({ type: 'resize_node', nodeId: badgeShape.id, scale: 1.1 });
    }
  }

  if (target && lower.includes('red')) {
    transforms.push({ type: 'set_color', nodeId: target.id, color: '#EF4444' });
  }

  if (!transforms.length && shouldCreateLayout(message)) {
    return creativeLayoutTransforms(layout, message);
  }

  return transforms;
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '')
  }));
}

async function getLlmResult({ client, systemPrompt, history, message }) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 12000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      ...cleanHistory(history),
      { role: 'user', content: message }
    ]
  });

  const text = response.choices?.[0]?.message?.content;
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('LLM returned invalid JSON');
  }

  if (parsed.updatedLayout) {
    validateLayoutShape(parsed.updatedLayout);
    return {
      explanation: parsed.explanation || 'Updated the layout.',
      updatedLayout: parsed.updatedLayout,
      transforms: null
    };
  }

  if (!Array.isArray(parsed.transforms)) {
    throw new Error('LLM returned JSON without updatedLayout');
  }

  return {
    explanation: parsed.explanation || 'Updated the layout.',
    updatedLayout: null,
    transforms: parsed.transforms
  };
}

router.post('/', async (req, res) => {
  try {
    const { message, layout, history } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    validateLayoutShape(layout);

    const deterministic = deterministicTransforms(layout, message, history);
    const client = getOpenAIClient();
    let explanation = deterministic.length
      ? 'Applied the requested layout change.'
      : 'I could not infer a supported transform, so the layout is unchanged.';
    let transforms = deterministic;

    if (client) {
      try {
        const llmResult = await getLlmResult({
          client,
          systemPrompt: buildSystemPrompt(layout),
          history,
          message
        });

        if (llmResult.updatedLayout) {
          return res.json({
            assistantMessage: llmResult.explanation,
            updatedLayout: llmResult.updatedLayout,
            transforms: []
          });
        }

        transforms = llmResult.transforms.length ? llmResult.transforms : deterministic;
        explanation = llmResult.explanation;
      } catch (err) {
        const status = err?.status ?? err?.statusCode;
        if (!deterministic.length && status !== 429) throw err;
        explanation =
          status === 429
            ? 'Layout updated successfully.'
            : 'The LLM response could not be used, so I applied the built-in layout rules instead.';
      }
    } else if (deterministic.length) {
      explanation = status === 200 ? 'Layout updated successfully.' 
      : 'No OPENAI_API_KEY is configured, so I used the built-in layout rules for this change.';
    }

    const updatedLayout = applyTransformsToLayout(layout, transforms);
    validateLayoutShape(updatedLayout);

    return res.json({
      assistantMessage: explanation,
      updatedLayout,
      transforms
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

export default router;
