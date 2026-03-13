/**
 * POST /api/automation/visual-explainer/generate
 *
 * Generate a visual explanation from a template or custom request.
 * Returns 503 when disabled (default). Mock-only in safe mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import automationConfig from '../../../../../../automation/config/automationConfig';
import { explainFromTemplate, explainCustom, listAvailableTemplates } from '../../../../../../automation/visual-explainer/visualExplainerService';
import { render } from '../../../../../../automation/visual-explainer/visualExplainerRenderer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!automationConfig.enabled || !automationConfig.allowVisualExplainer) {
    return NextResponse.json(
      { success: false, error: 'Visual explainer is disabled' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { templateId, request, format } = body;

    if (templateId) {
      const result = explainFromTemplate(templateId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: `Template "${templateId}" not found. Available: ${listAvailableTemplates().join(', ')}` },
          { status: 404 },
        );
      }
      const rendered = render(result, format || 'text');
      return NextResponse.json({ success: true, data: { result, rendered } });
    }

    if (request) {
      const result = explainCustom(request);
      const rendered = render(result, format || 'text');
      return NextResponse.json({ success: true, data: { result, rendered } });
    }

    return NextResponse.json(
      { success: false, error: 'Provide templateId or request object' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
